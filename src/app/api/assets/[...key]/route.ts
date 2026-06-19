import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

// 经此路由读出本地存储的图片（上云后改由 R2 公网 URL，本路由可去掉）
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key } = await ctx.params;
  const storageKey = key.join("/");
  try {
    const data = await storage.get(storageKey);
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
