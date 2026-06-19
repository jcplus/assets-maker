import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { position, queueTotal } from "@/lib/services/queue";

// 轮询：状态 / 进度 / 排队位置；done 时附 assets
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await prisma.generationJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const assets =
    job.status === "done"
      ? await prisma.asset.findMany({
          where: { jobId: id, deletedAt: null },
          orderBy: { createdAt: "asc" },
        })
      : [];

  return NextResponse.json({
    id: job.id,
    name: job.name,
    status: job.status,
    completed: job.completed,
    count: job.count,
    progress: job.count > 0 ? Math.round((job.completed / job.count) * 100) : 0,
    position: position(id),
    queueTotal: queueTotal(),
    error: job.error,
    assets,
  });
}

// 软删
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await prisma.generationJob.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
