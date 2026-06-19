import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { drawThings } from "@/lib/providers/draw-things";

export async function GET() {
  const [db, provider] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    drawThings.ping(),
  ]);
  return NextResponse.json({
    db,
    provider: { id: drawThings.id, online: provider },
  });
}
