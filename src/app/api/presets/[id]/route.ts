import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
