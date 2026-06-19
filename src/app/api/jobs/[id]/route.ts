import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { position, queueTotal } from "@/lib/services/queue";

// 轮询：状态 / 进度 / 排队位置；done 时附 assets
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await prisma.generationJob.findUnique({
    where: { id },
    include: {
      preset: {
        select: { id: true, category: true, variableSlots: true, lockedParams: true },
      },
    },
  });
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // 始终返回已存在的资产，使前端在生成中也能逐张显示已完成的缩略图
  const assets = await prisma.asset.findMany({
    where: { jobId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

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
    presetId: job.presetId,
    preset: job.preset,
    variables: job.variables,
    assets,
  });
}

// 重命名
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const job = await prisma.generationJob.update({
    where: { id },
    data: { name },
    select: { id: true, name: true },
  });
  return NextResponse.json(job);
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
