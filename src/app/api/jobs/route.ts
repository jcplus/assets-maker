import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 侧边栏 / View all 列表：未删 job + 每个的图片数
export async function GET(req: NextRequest) {
  const recent = req.nextUrl.searchParams.get("recent");
  const take = recent ? Math.max(1, Math.min(50, Number(recent) || 10)) : 200;

  const jobs = await prisma.generationJob.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      status: true,
      count: true,
      completed: true,
      createdAt: true,
      _count: { select: { assets: true } },
    },
  });

  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      count: j.count,
      completed: j.completed,
      createdAt: j.createdAt,
      assetCount: j._count.assets,
    }))
  );
}
