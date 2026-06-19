/**
 * 工业化分层提示词引擎 —— 把视觉哲学固化成「Style Bible（锁定层）+ 变量层」结构，
 * 在固定层序上拼装，对抗风格漂移。client / server 共用（无框架依赖，勿引入 prisma）。
 *
 * 规范层序（指示一、二）：
 *   [subject] + [pose/action] + [angle/camera]      ← 变量层（每次生成可选）
 *   + [style] + [material] + [lighting]              ← Style Bible（预设锁定）
 *   + [consistency] + [quality]                      ← Style Bible（预设锁定）
 *   negative 单独                                    ← Style Bible（预设锁定）
 */

export type Category = "scene" | "tileset" | "character" | "prop";

/** Style Bible —— 预设锁定的母提示词，强制带到每张资产上 */
export type StyleBible = {
  style: string;
  material: string;
  lighting: string;
  consistency: string;
  quality: string;
};

/** 单次生成的变量层 */
export type PromptVariables = {
  subject?: string;
  /** pose/action：已知 key（展开为 token 串）或自由文本 */
  pose?: string;
  /** angle/camera：已知 key（展开为 token 串）或自由文本 */
  angle?: string;
  extraPositive?: string;
};

/** 受控词表条目 */
export type VocabItem = { label: string; tokens: string };

/* ---------- 角度锁定（指示三）：最关键的约束 ---------- */

export const ANGLES: Record<string, VocabItem> = {
  front: {
    label: "正面 Front",
    tokens:
      "front view, orthographic view, symmetrical, camera facing subject, full body centered",
  },
  side: {
    label: "侧面 Side",
    tokens:
      "side view, left profile, orthographic side view, full body, neutral standing pose",
  },
  threeQuarter: {
    label: "45° 3/4",
    tokens:
      "3/4 view, slightly turned body, three quarter perspective, camera at chest height",
  },
  topDown: {
    label: "顶视 Top-down",
    tokens:
      "top-down view, isometric game perspective, 45 degree camera angle, diagonal projection, game tile friendly",
  },
};

/* ---------- 人物四视图（转面图）：正面/左侧面/右侧面/背面 ----------
 * 选「生成人物」时锁死四张，每张固定一个朝向，配合同一 seed + 一致性 token
 * 维持同一角色。顺序即生成顺序。 */
export const CHARACTER_TURNAROUND: { key: string; label: string; tokens: string }[] = [
  {
    key: "front",
    label: "正面 Front",
    tokens:
      "front view, orthographic view, symmetrical, camera facing subject, full body centered",
  },
  {
    key: "leftSide",
    label: "左侧面 Left",
    tokens:
      "left side view, left profile, orthographic side view, full body, neutral standing pose",
  },
  {
    key: "rightSide",
    label: "右侧面 Right",
    tokens:
      "right side view, right profile, orthographic side view, full body, neutral standing pose",
  },
  {
    key: "back",
    label: "背面 Back",
    tokens:
      "back view, rear view, orthographic view, symmetrical, camera behind subject, full body centered",
  },
];

/* ---------- 姿势/动作（指示四）：按 category ---------- */

export const POSES: Record<Category, Record<string, VocabItem>> = {
  character: {
    standing: {
      label: "站立 Standing",
      tokens: "neutral standing pose, arms relaxed, symmetrical body",
    },
    walking: {
      label: "行走 Walking",
      tokens:
        "walking forward, left leg stepping forward, right arm swinging, balanced posture, natural gait, feet visible",
    },
    watering: {
      label: "浇水 Watering",
      tokens:
        "holding watering can with both hands, slightly bending forward, plant watering pose",
    },
    smiling: {
      label: "微笑 Smiling",
      tokens: "neutral standing pose, gentle smiling expression, arms relaxed",
    },
  },
  scene: {
    establishing: {
      label: "全景 Establishing",
      tokens: "wide establishing shot, centered composition, balanced layout",
    },
  },
  tileset: {
    seamless: {
      label: "无缝 Seamless",
      tokens:
        "seamless texture, tileable, clean edge transition, uniform lighting, minimal shadow",
    },
  },
  prop: {
    isolated: {
      label: "独立 Isolated",
      tokens: "single isolated object, centered composition, clean silhouette",
    },
  },
};

/* ---------- 工业级负面（指示六）：复用基线 ---------- */

export const INDUSTRIAL_NEGATIVE =
  "low quality, blurry, deformed anatomy, bad hands, extra fingers, missing fingers, cropped body, out of frame, duplicate limbs, twisted legs, asymmetrical eyes, floating objects, incorrect perspective, fisheye distortion, oversaturated, photorealistic, realistic skin, 3d render, cgi, noise, watermark, text, logo, jpeg artifacts, messy background, complex background, dynamic camera, extreme perspective, dramatic lighting, heavy shadows, inconsistent style";

/** 同角色延续时强制注入的一致性 token（指示十一，txt2img 下靠 seed + 这些词维持一致） */
export const CONSISTENCY_TOKENS =
  "same character, same costume design, same face structure, same rendering style, consistent proportions";

/* ---------- 拼装 ---------- */

/** 把 angle/pose 解析为 token：已知 key 则展开，否则当自由文本原样用 */
export function resolveAngle(angle?: string): string {
  if (!angle) return "";
  return ANGLES[angle]?.tokens ?? angle;
}
export function resolvePose(category: Category, pose?: string): string {
  if (!pose) return "";
  return POSES[category]?.[pose]?.tokens ?? pose;
}

/** token 串清洗：拆分、去空、大小写不敏感去重、规整逗号空格 */
function cleanTokens(parts: (string | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const raw of part.split(",")) {
      const t = raw.trim().replace(/\s{2,}/g, " ");
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out.join(", ");
}

/**
 * 按规范层序拼装最终正向 prompt。
 * @param category 用于把 pose key 解析成对应分类的 token
 */
export function composePrompt(
  bible: StyleBible,
  vars: PromptVariables,
  category: Category
): string {
  return cleanTokens([
    vars.subject,
    resolvePose(category, vars.pose),
    resolveAngle(vars.angle),
    vars.extraPositive,
    bible.style,
    bible.material,
    bible.lighting,
    bible.consistency,
    bible.quality,
  ]);
}

/** 合并锁定负面 + 用户追加 */
export function composeNegative(negative: string, extra?: string): string {
  return cleanTokens([negative, extra]);
}
