import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CURRENT_USER_ID,
  mergeSettings,
  settingsSchema,
} from "@/lib/settings";

export async function GET() {
  const row = await prisma.userSettings.findUnique({
    where: { userId: CURRENT_USER_ID },
  });
  return NextResponse.json(mergeSettings(row?.data));
}

export async function PUT(req: NextRequest) {
  const parsed = settingsSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 与已存的设置合并，允许按 section 局部更新
  const existing = await prisma.userSettings.findUnique({
    where: { userId: CURRENT_USER_ID },
  });
  const merged = mergeSettings({
    ...(existing?.data as object | undefined),
    ...parsed.data,
  });

  const row = await prisma.userSettings.upsert({
    where: { userId: CURRENT_USER_ID },
    update: { data: merged },
    create: { userId: CURRENT_USER_ID, data: merged },
  });

  return NextResponse.json(mergeSettings(row.data));
}
