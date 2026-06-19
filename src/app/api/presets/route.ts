import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET() {
  const presets = await prisma.stylePreset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(presets);
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["scene", "tileset", "character", "prop"]),
  provider: z.string().default("draw-things"),
  promptTemplate: z.string().min(1),
  negativePrompt: z.string().default(""),
  lockedParams: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    steps: z.number().int().positive(),
    guidanceScale: z.number().positive(),
    seed: z.number().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const preset = await prisma.stylePreset.create({ data: parsed.data });
  return NextResponse.json(preset, { status: 201 });
}
