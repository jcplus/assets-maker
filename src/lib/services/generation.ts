import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { drawThings } from "@/lib/providers/draw-things";
import type { GenParams, ImageProvider } from "@/lib/providers/types";

const providers: Record<string, ImageProvider> = {
  "draw-things": drawThings,
};

/** 一次生成任务的实际配置（存在 GenerationJob.variables 里） */
export type JobConfig = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  seed: number; // -1 = 每张随机
};

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

/**
 * 执行一个生成任务：逐张生成（batch=1），每完成一张就累加 job.completed，
 * 使前端轮询能看到真实进度。Phase 1 由进程内队列 worker 调用。
 */
export async function runJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { preset: true },
  });
  if (!job) throw new Error(`job ${jobId} not found`);

  const provider = providers[job.preset.provider];
  if (!provider) throw new Error(`unknown provider ${job.preset.provider}`);

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "running", error: null, completed: 0 },
  });

  try {
    const cfg = job.variables as unknown as JobConfig;

    for (let i = 0; i < job.count; i++) {
      const seed = cfg.seed === -1 ? randomSeed() : cfg.seed;
      const params: GenParams = {
        width: cfg.width,
        height: cfg.height,
        steps: cfg.steps,
        guidanceScale: cfg.guidanceScale,
        seed,
      };

      const images = await provider.generate({
        prompt: cfg.prompt,
        negativePrompt: cfg.negativePrompt,
        params,
        count: 1,
      });

      const img = images[0];
      const key = `${job.preset.category}/${job.id}_${i}.png`;
      await storage.put(key, img.data);
      await prisma.asset.create({
        data: {
          jobId: job.id,
          presetId: job.presetId,
          category: job.preset.category,
          status: "draft",
          storageKey: key,
          width: cfg.width,
          height: cfg.height,
          meta: { ...img.meta, seed, renderedPrompt: cfg.prompt },
        },
      });

      await prisma.generationJob.update({
        where: { id: jobId },
        data: { completed: i + 1 },
      });
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "done" },
    });
  } catch (e) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", error: (e as Error).message },
    });
    throw e;
  }
}
