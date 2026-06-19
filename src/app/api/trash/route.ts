import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

// 回收站：聚合所有软删项
export async function GET() {
  const [presets, jobs, assets] = await Promise.all([
    prisma.stylePreset.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: { id: true, name: true, category: true, deletedAt: true },
    }),
    prisma.generationJob.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: { id: true, name: true, status: true, count: true, deletedAt: true },
    }),
    prisma.asset.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: { id: true, storageKey: true, category: true, deletedAt: true },
    }),
  ]);
  return NextResponse.json({ presets, jobs, assets });
}

const bodySchema = z.object({
  type: z.enum(["preset", "job", "asset"]),
  id: z.string(),
});

// 恢复：deletedAt = null
export async function PATCH(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, id } = parsed.data;
  if (type === "preset")
    await prisma.stylePreset.update({ where: { id }, data: { deletedAt: null } });
  else if (type === "job")
    await prisma.generationJob.update({ where: { id }, data: { deletedAt: null } });
  else await prisma.asset.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
}

// 彻底删除：删存储文件 + DB 行（preset/job 级联删 assets 行）
export async function DELETE(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, id } = parsed.data;

  if (type === "asset") {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (asset) {
      await storage.delete(asset.storageKey);
      await prisma.asset.delete({ where: { id } });
    }
  } else if (type === "job") {
    const assets = await prisma.asset.findMany({ where: { jobId: id } });
    await Promise.all(assets.map((a) => storage.delete(a.storageKey)));
    await prisma.generationJob.delete({ where: { id } });
  } else {
    const assets = await prisma.asset.findMany({ where: { presetId: id } });
    await Promise.all(assets.map((a) => storage.delete(a.storageKey)));
    await prisma.stylePreset.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}
