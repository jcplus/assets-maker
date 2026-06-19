/**
 * 内置预设 —— 把指示里的「工业化资产生成模板」固化为分层 Style Bible。
 * styleBible 五层锁定（style/material/lighting/consistency/quality），单次生成不可改写；
 * variableSlots 声明本预设暴露的变量层与受控词表（angle/pose 选项、是否允许自由主体）。
 */
import { INDUSTRIAL_NEGATIVE, type Category, type StyleBible } from "../prompt-layers.ts";

export type BuiltinPreset = {
  id: string;
  name: string;
  description: string;
  category: Category;
  provider: string;
  styleBible: StyleBible;
  negativePrompt: string;
  variableSlots: {
    angles: string[];
    poses: string[];
    allowFreeSubject: boolean;
    defaultAngle?: string;
    defaultPose?: string;
  };
  lockedParams: {
    width: number;
    height: number;
    steps: number;
    guidanceScale: number;
    seed: number;
  };
};

/** 全项目共享的「风格母提示词」基底（指示十 Style Bible），各预设在此之上微调 */
const COZY_BASE: StyleBible = {
  style:
    "cozy rural fantasy game art, hand-painted stylized rendering, Studio Ghibli inspired, Nintendo-inspired proportions, soft storybook rendering",
  material:
    "clean silhouette, simple readable shapes, large shape language, game-ready design, clean outlines, medium line weight",
  lighting:
    "soft indirect lighting, warm natural colours, minimal harsh shadows",
  consistency:
    "warm muted earthy palette, low saturation, warm greens and browns, consistent rendering style",
  quality: "high quality, sharp edges, sharp line clarity, clean edges",
};

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  {
    id: "preset-character-cozy",
    name: "角色 · 自然系农场",
    description: "全身角色立绘标准模板。正面/侧面/45° 锁定，统一面部与服装，透明背景。",
    category: "character",
    provider: "draw-things",
    styleBible: {
      ...COZY_BASE,
      consistency:
        "consistent costume design, consistent face proportions, " +
        COZY_BASE.consistency,
      quality: "full body character sprite, transparent background, " + COZY_BASE.quality,
    },
    negativePrompt: INDUSTRIAL_NEGATIVE,
    variableSlots: {
      angles: ["front", "side", "threeQuarter"],
      poses: ["standing", "walking", "watering", "smiling"],
      allowFreeSubject: true,
      defaultAngle: "front",
      defaultPose: "standing",
    },
    lockedParams: { width: 512, height: 768, steps: 24, guidanceScale: 4, seed: -1 },
  },
  {
    id: "preset-building-cozy",
    name: "建筑 · 乡村小屋",
    description: "等距建筑资产，固定屋顶角度与几何，木石材质，透明背景。对抗建筑风格漂移。",
    category: "prop",
    provider: "draw-things",
    styleBible: {
      ...COZY_BASE,
      material:
        "isometric game building, wood and stone materials, consistent roof angle, simple geometry, readable silhouette, modular design, stylized windows, stylized doors",
      quality: "asset sheet style, transparent background, " + COZY_BASE.quality,
    },
    negativePrompt: INDUSTRIAL_NEGATIVE,
    variableSlots: {
      angles: ["topDown", "front"],
      poses: ["isolated"],
      allowFreeSubject: true,
      defaultAngle: "topDown",
      defaultPose: "isolated",
    },
    lockedParams: { width: 768, height: 768, steps: 24, guidanceScale: 4, seed: -1 },
  },
  {
    id: "preset-tile-cozy",
    name: "Tile · 地面贴图",
    description: "可平铺无缝地面贴图，顶视、均匀光照、干净边缘过渡，避免脏。",
    category: "tileset",
    provider: "draw-things",
    styleBible: {
      ...COZY_BASE,
      material:
        "seamless texture, tileable, top-down game tile, clean edge transition, uniform lighting, minimal shadow, stylized hand-painted ground texture",
      lighting: "uniform flat lighting, minimal shadow",
      quality: COZY_BASE.quality,
    },
    negativePrompt: INDUSTRIAL_NEGATIVE,
    variableSlots: {
      angles: ["topDown"],
      poses: ["seamless"],
      allowFreeSubject: true,
      defaultAngle: "topDown",
      defaultPose: "seamless",
    },
    lockedParams: { width: 512, height: 512, steps: 20, guidanceScale: 4, seed: -1 },
  },
  {
    id: "preset-scene-cozy",
    name: "场景 · 自然系农场",
    description: "微缩世界氛围，顶视/移轴，统一而非精致。适合小镇经营、森林、农场景观。",
    category: "scene",
    provider: "draw-things",
    styleBible: {
      ...COZY_BASE,
      style:
        "cozy pixel art countryside, miniature diorama rendering, tilt shift, nostalgic game aesthetic, " +
        COZY_BASE.style,
      lighting: "soft sunlight through trees, warm ambient light, subtle bloom",
      quality: COZY_BASE.quality,
    },
    negativePrompt: INDUSTRIAL_NEGATIVE,
    variableSlots: {
      angles: ["topDown", "threeQuarter"],
      poses: ["establishing"],
      allowFreeSubject: true,
      defaultAngle: "topDown",
      defaultPose: "establishing",
    },
    lockedParams: { width: 1024, height: 576, steps: 20, guidanceScale: 4, seed: -1 },
  },
];
