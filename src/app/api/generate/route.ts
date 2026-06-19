import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runJob } from "@/lib/services/generation";

const schema = z.object({
  presetId: z.string().min(1),
  variables: z.record(z.string(), z.string()).default({}),
  count: z.number().int().min(1).max(20).default(4),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { presetId, variables, count } = parsed.data;

  const preset = await prisma.stylePreset.findUnique({ where: { id: presetId } });
  if (!preset) {
    return NextResponse.json({ error: "preset not found" }, { status: 404 });
  }

  const job = await prisma.generationJob.create({
    data: { presetId, variables, count },
  });

  // Phase 1：同步执行（小批量本地够用）。Phase 4 改成入队，立即返回 jobId。
  try {
    await runJob(job.id);
  } catch (e) {
    return NextResponse.json(
      { jobId: job.id, status: "failed", error: (e as Error).message },
      { status: 502 }
    );
  }

  const assets = await prisma.asset.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ jobId: job.id, status: "done", assets });
}
