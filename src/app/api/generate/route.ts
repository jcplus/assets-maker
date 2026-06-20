import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { enqueue, hasActive } from "@/lib/services/queue";
import {
  composePrompt,
  composeNegative,
  CONSISTENCY_TOKENS,
  CHARACTER_TURNAROUND,
  type Category,
  type StyleBible,
} from "@/lib/prompt-layers";
import type { JobConfig } from "@/lib/services/generation";

const schema = z.object({
  name: z.string().min(1).default("未命名生成"),
  presetId: z.string().min(1),
  subject: z.string().default(""),
  angle: z.string().default(""),
  pose: z.string().default(""),
  extraPositive: z.string().default(""),
  extraNegative: z.string().default(""),
  /** 「同角色换动作/表情」：来源资产 id —— 复用其 seed/subject 并注入一致性约束 */
  parentAssetId: z.string().optional(),
  width: z.number().int().min(128).max(4096).multipleOf(8),
  height: z.number().int().min(128).max(4096).multipleOf(8),
  count: z.number().int().min(1).max(20).default(4),
  steps: z.number().int().min(1).max(100).default(8),
  guidanceScale: z.number().min(1).max(10).default(4),
  seed: z.number().int().default(-1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 前后端都禁止并发批次：已有任务在跑/排队就拒绝
  if (hasActive()) {
    return NextResponse.json(
      { error: "已有批次在进行，请等待完成" },
      { status: 409 }
    );
  }

  const {
    name,
    presetId,
    count,
    subject,
    angle,
    pose,
    extraPositive,
    extraNegative,
    parentAssetId,
    width,
    height,
    steps,
    guidanceScale,
    seed,
  } = parsed.data;

  const preset = await prisma.stylePreset.findFirst({
    where: { id: presetId, deletedAt: null },
  });
  if (!preset) {
    return NextResponse.json({ error: "preset not found" }, { status: 404 });
  }

  const bible = preset.styleBible as unknown as StyleBible;
  const category = preset.category as Category;

  // 「同角色」延续：从父资产取 seed + subject，强制注入一致性 token，锁定 seed
  let effSubject = subject;
  let effSeed = seed;
  let extraConsistency = "";
  if (parentAssetId) {
    const parent = await prisma.asset.findFirst({
      where: { id: parentAssetId, deletedAt: null },
    });
    if (!parent) {
      return NextResponse.json({ error: "parent asset not found" }, { status: 404 });
    }
    const meta = (parent.meta ?? {}) as Record<string, unknown>;
    if (!effSubject && typeof meta.subject === "string") effSubject = meta.subject;
    if (typeof meta.seed === "number") effSeed = meta.seed; // txt2img 下靠同 seed 维持一致
    extraConsistency = CONSISTENCY_TOKENS;
  }

  // 「生成人物」：锁死四视图（正面/左侧面/右侧面/背面）。同一角色需共用 seed +
  // 一致性 token，故 -1 时先固定一个随机 seed，并强制注入一致性约束。
  const isCharacter = category === "character";
  let effCount = count;
  let composedPrompts: string[] | undefined;
  let anglesPerImage: string[] | undefined;
  if (isCharacter) {
    effCount = CHARACTER_TURNAROUND.length;
    if (effSeed === -1) effSeed = Math.floor(Math.random() * 2_147_483_647);
    if (!extraConsistency) extraConsistency = CONSISTENCY_TOKENS;
    const extraPos = [extraPositive, extraConsistency].filter(Boolean).join(", ");
    composedPrompts = CHARACTER_TURNAROUND.map((view) =>
      composePrompt(
        bible,
        { subject: effSubject, pose, angle: view.tokens, extraPositive: extraPos },
        category
      )
    );
    anglesPerImage = CHARACTER_TURNAROUND.map((v) => v.key);
  }

  const composedPrompt = composePrompt(
    bible,
    { subject: effSubject, pose, angle, extraPositive: [extraPositive, extraConsistency].filter(Boolean).join(", ") },
    category
  );
  const composedNegative = composeNegative(preset.negativePrompt, extraNegative);

  const cfg: JobConfig = {
    subject: effSubject,
    angle,
    pose,
    extraPositive,
    extraNegative,
    composedPrompt,
    composedNegative,
    composedPrompts,
    anglesPerImage,
    parentAssetId,
    width,
    height,
    steps,
    guidanceScale,
    seed: effSeed,
  };

  const job = await prisma.generationJob.create({
    data: { name, presetId, count: effCount, variables: cfg, status: "queued" },
  });

  enqueue(job.id);

  return NextResponse.json({ jobId: job.id, status: "queued" }, { status: 202 });
}
