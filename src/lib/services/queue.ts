import { runJob } from "@/lib/services/generation";

/**
 * 进程内生成队列（Phase 1）。单 GPU → 单 worker、FIFO、一次只跑一个 job。
 * 用 globalThis 单例避免 dev 热重载丢状态（仿照 src/lib/db.ts）。
 * 多实例部署不适用（Phase 4 换 BullMQ + Redis）。
 */
type QueueState = {
  pending: string[];
  running: string | null;
};

const globalForQueue = globalThis as unknown as { genQueue?: QueueState };

const queue: QueueState =
  globalForQueue.genQueue ?? { pending: [], running: null };

if (process.env.NODE_ENV !== "production") globalForQueue.genQueue = queue;

function tick(): void {
  if (queue.running || queue.pending.length === 0) return;
  const jobId = queue.pending.shift()!;
  queue.running = jobId;
  // 不 await：让 enqueue 立即返回，worker 在后台跑
  runJob(jobId)
    .catch(() => {
      // runJob 内部已把错误落库为 failed，这里吞掉避免未捕获 rejection
    })
    .finally(() => {
      queue.running = null;
      tick();
    });
}

/** 入队并触发 worker */
export function enqueue(jobId: string): void {
  queue.pending.push(jobId);
  tick();
}

/**
 * 队列位置：
 *  - 正在生成 → 0
 *  - 排队中 → 前面还有几个（1-based 之前的数量）
 *  - 不在队列（已完成/失败）→ -1
 */
export function position(jobId: string): number {
  if (queue.running === jobId) return 0;
  const idx = queue.pending.indexOf(jobId);
  if (idx === -1) return -1;
  // running 占 1 位 + 前面 pending 的数量
  return (queue.running ? 1 : 0) + idx;
}

/** 队列里总任务数（running + pending） */
export function queueTotal(): number {
  return (queue.running ? 1 : 0) + queue.pending.length;
}

/** 是否有正在进行或排队的任务（用于禁止并发批次） */
export function hasActive(): boolean {
  return queue.running !== null || queue.pending.length > 0;
}
