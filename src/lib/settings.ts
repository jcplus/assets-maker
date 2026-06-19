import { z } from "zod";

/**
 * 用户设置 —— 集中定义 schema、默认值与 section 划分。
 * API 与 设置页 共享此处，避免两边漂移。
 * 当前无鉴权，固定单用户；将来接入鉴权时替换 CURRENT_USER_ID。
 */
export const CURRENT_USER_ID = "james";

/** 支持的生成服务。 */
export const PROVIDER_KINDS = [
  "draw-things",
  "ollama",
  "claude",
  "openai",
  "google",
] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** 需要 API Key 的云端服务 —— 入库不回传明文，前端只见掩码。 */
export const SECRET_PROVIDERS = ["claude", "openai", "google"] as const;
export type SecretProvider = (typeof SECRET_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  "draw-things": "Draw Things",
  ollama: "Ollama",
  claude: "Claude",
  openai: "OpenAI",
  google: "Google",
};

/** 各服务可选模型（下拉）。Ollama 收录较新的免费 txt2img 开源模型。 */
export const PROVIDER_MODELS: Record<Exclude<ProviderKind, "draw-things">, string[]> = {
  ollama: [
    "flux.1-schnell",
    "flux.1-dev",
    "stable-diffusion-3.5-large",
    "stable-diffusion-3.5-medium",
    "sdxl-turbo",
  ],
  claude: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-image-1", "dall-e-3"],
  google: ["gemini-3.1-flash-lite"],
};

export const settingsSchema = z.object({
  provider: z.object({
    /** 当前启用的生成服务 */
    active: z.enum(PROVIDER_KINDS),
    drawThings: z.object({
      url: z.string().url(),
      txt2imgPath: z.string().min(1),
    }),
    ollama: z.object({
      url: z.string().url(),
      model: z.string().min(1),
    }),
    // apiKey 可为空字符串或掩码串，故不加 url/min 约束
    claude: z.object({
      apiKey: z.string(),
      model: z.string().min(1),
    }),
    openai: z.object({
      apiKey: z.string(),
      model: z.string().min(1),
    }),
    google: z.object({
      apiKey: z.string(),
      model: z.string().min(1),
    }),
  }),
  generation: z.object({
    defaultWidth: z.number().int().min(128).max(2048),
    defaultHeight: z.number().int().min(128).max(2048),
    defaultSteps: z.number().int().min(1).max(150),
    defaultGuidanceScale: z.number().min(1).max(20),
    defaultCount: z.number().int().min(1).max(20),
  }),
  appearance: z.object({
    theme: z.enum(["system", "light", "dark"]),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsSection = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  provider: {
    active: "draw-things",
    drawThings: {
      url: process.env.DRAW_THINGS_URL ?? "http://127.0.0.1:7860",
      txt2imgPath: process.env.DRAW_THINGS_TXT2IMG ?? "/sdapi/v1/txt2img",
    },
    ollama: {
      url: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
      model: "flux.1-schnell",
    },
    claude: { apiKey: "", model: "claude-opus-4-8" },
    openai: { apiKey: "", model: "gpt-image-1" },
    google: { apiKey: "", model: "gemini-3.1-flash-lite" },
  },
  generation: {
    defaultWidth: 256,
    defaultHeight: 256,
    defaultSteps: 8,
    defaultGuidanceScale: 4,
    defaultCount: 4,
  },
  appearance: {
    theme: "system",
  },
};

/** 把存库的（可能不完整/旧结构的）data 与默认值深合并，保证返回结构完整。 */
export function mergeSettings(stored: unknown): Settings {
  const s = (stored ?? {}) as Partial<Settings>;
  const p = (s.provider ?? {}) as Partial<Settings["provider"]>;
  const d = DEFAULT_SETTINGS.provider;
  return {
    provider: {
      active: p.active ?? d.active,
      drawThings: { ...d.drawThings, ...p.drawThings },
      ollama: { ...d.ollama, ...p.ollama },
      claude: { ...d.claude, ...p.claude },
      openai: { ...d.openai, ...p.openai },
      google: { ...d.google, ...p.google },
    },
    generation: { ...DEFAULT_SETTINGS.generation, ...s.generation },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...s.appearance },
  };
}

/** 掩码：保留首 6 + 末 6 位，其余星号；过短则全星号。明文绝不回传前端。 */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 12) return "*".repeat(key.length);
  return key.slice(0, 6) + "*".repeat(key.length - 12) + key.slice(-6);
}

/** 含星号即视为掩码/未改动（真实 key 不含星号）。 */
export function isMaskedKey(v: string): boolean {
  return v.includes("*");
}

/** 把真实设置转成可下发前端的掩码版本（云端 apiKey 打码）。 */
export function maskSettings(s: Settings): Settings {
  const out = structuredClone(s);
  for (const p of SECRET_PROVIDERS) {
    out.provider[p].apiKey = maskKey(s.provider[p].apiKey);
  }
  return out;
}

/**
 * 合并待保存设置：当传入的 apiKey 为空或为掩码串（即前端没有重新输入），
 * 保留库中已有的明文 key，避免被掩码覆盖。
 */
export function preserveSecrets(incoming: Settings, existing: Settings): Settings {
  const out = structuredClone(incoming);
  for (const p of SECRET_PROVIDERS) {
    const inKey = incoming.provider[p].apiKey;
    if (!inKey || isMaskedKey(inKey)) {
      out.provider[p].apiKey = existing.provider[p].apiKey;
    }
  }
  return out;
}

/** section 元数据，驱动设置页左侧导航。 */
export const SECTIONS: { id: SettingsSection; label: string; desc: string }[] = [
  { id: "provider", label: "生成服务", desc: "选择并配置图像生成服务" },
  { id: "generation", label: "生成默认值", desc: "新建生成时的默认参数" },
  { id: "appearance", label: "外观", desc: "主题与显示偏好" },
];
