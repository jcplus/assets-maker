import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CURRENT_USER_ID,
  maskSettings,
  mergeSettings,
  preserveSecrets,
  settingsSchema,
} from "@/lib/settings";

export async function GET() {
  const row = await prisma.userSettings.findUnique({
    where: { userId: CURRENT_USER_ID },
  });
  // 明文 apiKey 绝不下发，前端只见掩码
  return NextResponse.json(maskSettings(mergeSettings(row?.data)));
}

export async function PUT(req: NextRequest) {
  const parsed = settingsSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.userSettings.findUnique({
    where: { userId: CURRENT_USER_ID },
  });
  // 库中明文设置（含真实 key），用于按 section 局部更新 + 保护未改动的 key
  const current = mergeSettings(existing?.data);
  const merged = preserveSecrets(
    mergeSettings({ ...current, ...parsed.data }),
    current
  );

  const row = await prisma.userSettings.upsert({
    where: { userId: CURRENT_USER_ID },
    update: { data: merged },
    create: { userId: CURRENT_USER_ID, data: merged },
  });

  // 回传掩码版本，明文不出库
  return NextResponse.json(maskSettings(mergeSettings(row.data)));
}
