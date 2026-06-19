import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? undefined;
  const status = sp.get("status") ?? undefined;

  const assets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      ...(category ? { category: category as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(assets);
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "approved", "rejected"]),
});

// 人工挑选入库：approve / reject
export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const asset = await prisma.asset.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json(asset);
}

const deleteSchema = z.object({ id: z.string() });

// 软删单个 asset（真删只在回收站 /api/trash）
export async function DELETE(req: NextRequest) {
  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await prisma.asset.update({
    where: { id: parsed.data.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
