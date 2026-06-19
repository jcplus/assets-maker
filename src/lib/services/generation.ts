import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { drawThings } from "@/lib/providers/draw-things";
import { renderPrompt } from "@/lib/prompt";
import type { GenParams, ImageProvider } from "@/lib/providers/types";

const providers: Record<string, ImageProvider> = {
  "draw-things": drawThings,
};

/**
 * 执行一个生成任务：渲染 prompt（用预设锁定参数）→ 调 provider → 落盘 → 写 Asset(draft)。
 * Phase 1 同步执行；Phase 4 可改为队列 worker 消费。
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
    data: { status: "running", error: null },
  });

  try {
    const variables = (job.variables ?? {}) as Record<string, string>;
    const prompt = renderPrompt(job.preset.promptTemplate, variables);
    // 锁定参数来自预设，单次任务不可覆盖 —— 这是防漂移的核心约束
    const params = job.preset.lockedParams as unknown as GenParams;

    const images = await provider.generate({
      prompt,
      negativePrompt: job.preset.negativePrompt,
      params,
      count: job.count,
    });

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const key = `${job.preset.category}/${job.id}_${i}.png`;
      await storage.put(key, img.data);
      await prisma.asset.create({
        data: {
          jobId: job.id,
          presetId: job.presetId,
          category: job.preset.category,
          status: "draft",
          storageKey: key,
          width: params.width,
          height: params.height,
          meta: { ...img.meta, renderedPrompt: prompt },
        },
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
