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
  styleBible: z.object({
    style: z.string().default(""),
    material: z.string().default(""),
    lighting: z.string().default(""),
    consistency: z.string().default(""),
    quality: z.string().default(""),
  }),
  negativePrompt: z.string().default(""),
  variableSlots: z.object({
    angles: z.array(z.string()).default([]),
    poses: z.array(z.string()).default([]),
    allowFreeSubject: z.boolean().default(true),
    defaultAngle: z.string().optional(),
    defaultPose: z.string().optional(),
  }),
  lockedParams: z.object({
    width: z.number().int().min(128),
    height: z.number().int().min(128),
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
