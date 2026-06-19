/**
 * 内置预设 —— 把 chat.md 的视觉哲学固化。
 * lockedParams 固定生成参数（防漂移）；promptTemplate 用 {占位符} 让用户填空而非自由写 prompt。
 */
export const BUILTIN_PRESETS = [
  {
    id: "preset-cozy-countryside",
    name: "方案D · 自然系农场",
    description:
      "微缩世界氛围 / 高光照低分辨率像素景观。适合小镇经营、自然恢复、森林、农场。重点是统一而非精致。",
    category: "scene" as const,
    provider: "draw-things",
    promptTemplate:
      "cozy pixel art countryside, {subject}, {time_of_day}, soft sunlight through trees, peaceful atmosphere, handcrafted tiles, lush vegetation, miniature diorama rendering, soft focus photography, warm ambient light, tiny pixel people, nostalgic game aesthetic, natural colour palette, relaxing exploration game, reflective water, subtle bloom, emotional indie game environment, top-down, tilt shift, muted colours, earth tone palette, low saturation",
    negativePrompt:
      "mobile game aesthetic, cartoon outline, realistic grass, photorealistic textures, high saturation, sharp edges, anime, hd illustration, high detail realism",
    lockedParams: {
      width: 1024,
      height: 576, // 16:9
      steps: 20,
      guidanceScale: 4,
      seed: -1,
    },
  },
];
