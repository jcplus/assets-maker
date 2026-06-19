import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { enqueue, hasActive } from "@/lib/services/queue";

const schema = z.object({
  name: z.string().min(1).default("未命名生成"),
  presetId: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().default(""),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  count: z.number().int().min(1).max(20).default(4),
  steps: z.number().int().min(1).max(100).default(8),
  guidanceScale: z.number().min(1).max(10).default(4),
  seed: z.number().int().default(-1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 前后端都禁止并发批次：已有任务在跑/排队就拒绝
  if (hasActive()) {
    return NextResponse.json(
      { error: "已有批次在进行，请等待完成" },
      { status: 409 }
    );
  }

  const { name, presetId, count, ...cfg } = parsed.data;

  const preset = await prisma.stylePreset.findFirst({
    where: { id: presetId, deletedAt: null },
  });
  if (!preset) {
    return NextResponse.json({ error: "preset not found" }, { status: 404 });
  }

  const job = await prisma.generationJob.create({
    data: { name, presetId, count, variables: cfg, status: "queued" },
  });

  enqueue(job.id);

  return NextResponse.json({ jobId: job.id, status: "queued" }, { status: 202 });
}
