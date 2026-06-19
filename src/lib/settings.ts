import { z } from "zod";

/**
 * 用户设置 —— 集中定义 schema、默认值与 section 划分。
 * API 与 设置页 共享此处，避免两边漂移。
 * 当前无鉴权，固定单用户；将来接入鉴权时替换 CURRENT_USER_ID。
 */
export const CURRENT_USER_ID = "james";

export const settingsSchema = z.object({
  provider: z.object({
    drawThingsUrl: z.string().url(),
    txt2imgPath: z.string().min(1),
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
    drawThingsUrl: process.env.DRAW_THINGS_URL ?? "http://127.0.0.1:7860",
    txt2imgPath: process.env.DRAW_THINGS_TXT2IMG ?? "/sdapi/v1/txt2img",
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

/** 把存库的（可能不完整的）data 与默认值深合并，保证返回结构完整。 */
export function mergeSettings(stored: unknown): Settings {
  const s = (stored ?? {}) as Partial<Settings>;
  return {
    provider: { ...DEFAULT_SETTINGS.provider, ...s.provider },
    generation: { ...DEFAULT_SETTINGS.generation, ...s.generation },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...s.appearance },
  };
}

/** section 元数据，驱动设置页左侧导航。 */
export const SECTIONS: { id: SettingsSection; label: string; desc: string }[] = [
  { id: "provider", label: "生成服务", desc: "Draw Things 接口地址" },
  { id: "generation", label: "生成默认值", desc: "新建生成时的默认参数" },
  { id: "appearance", label: "外观", desc: "主题与显示偏好" },
];
