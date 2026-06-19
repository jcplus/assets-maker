import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 详情
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const preset = await prisma.stylePreset.findFirst({
    where: { id, deletedAt: null },
  });
  if (!preset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(preset);
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
  const preset = await prisma.stylePreset.update({
    where: { id },
    data: { name },
    select: { id: true, name: true },
  });
  return NextResponse.json(preset);
}

// 软删预设
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await prisma.stylePreset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
