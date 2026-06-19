"use client";

import { useState } from "react";
import {
  ANGLES,
  POSES,
  type Category,
  type StyleBible,
} from "@/lib/prompt-layers";

export type VariableSlots = {
  angles: string[];
  poses: string[];
  allowFreeSubject: boolean;
  defaultAngle?: string;
  defaultPose?: string;
};

export type Preset = {
  id: string;
  name: string;
  description?: string;
  category: Category;
  styleBible: StyleBible;
  negativePrompt: string;
  variableSlots: VariableSlots;
  lockedParams: {
    width: number;
    height: number;
    steps: number;
    guidanceScale: number;
    seed?: number;
  };
};

const CATEGORIES: Category[] = ["scene", "tileset", "character", "prop"];

const field = "w-full rounded border border-border bg-background p-2 text-sm";

const BIBLE_FIELDS: { key: keyof StyleBible; label: string }[] = [
  { key: "style", label: "风格 style" },
  { key: "material", label: "材质 material" },
  { key: "lighting", label: "光照 lighting" },
  { key: "consistency", label: "一致性 consistency" },
  { key: "quality", label: "质量 quality" },
];

/** 无缝新建预设表单。提交成功后回调新建的预设 */
export function PresetForm({
  onCreated,
}: {
  onCreated: (preset: Preset) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("scene");
  const [bible, setBible] = useState<StyleBible>({
    style: "",
    material: "",
    lighting: "",
    consistency: "",
    quality: "",
  });
  const [negativePrompt, setNegativePrompt] = useState("");
  const [angles, setAngles] = useState<string[]>([]);
  const [poses, setPoses] = useState<string[]>([]);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [steps, setSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setLayer(key: keyof StyleBible, value: string) {
    setBible((b) => ({ ...b, [key]: value }));
  }
  function toggle(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);
  }

  async function submit() {
    if (!name.trim() || !bible.style.trim()) {
      setError("名称与至少 style 层必填");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          styleBible: bible,
          negativePrompt,
          variableSlots: {
            angles,
            poses,
            allowFreeSubject: true,
            defaultAngle: angles[0],
            defaultPose: poses[0],
          },
          lockedParams: { width, height, steps, guidanceScale, seed: -1 },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors ?? "创建失败");
      onCreated(data as Preset);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const poseVocab = POSES[category] ?? {};

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="mb-1 block text-xs text-muted">名称</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">分类</label>
        <select
          className={field}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="rounded border border-border p-3">
        <legend className="px-1 text-xs font-medium">🔒 Style Bible（锁定层）</legend>
        <div className="space-y-2">
          {BIBLE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-muted">{label}</label>
              <textarea
                className={`${field} h-12`}
                value={bible[key]}
                onChange={(e) => setLayer(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-xs text-muted">负面提示词（锁定）</label>
        <textarea
          className={`${field} h-16`}
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
        />
      </div>

      <fieldset className="rounded border border-border p-3">
        <legend className="px-1 text-xs font-medium">变量层词表</legend>
        <p className="mb-1 text-xs text-muted">视角</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {Object.entries(ANGLES).map(([k, v]) => (
            <Chip key={k} active={angles.includes(k)} onClick={() => toggle(angles, setAngles, k)}>
              {v.label}
            </Chip>
          ))}
        </div>
        <p className="mb-1 text-xs text-muted">姿势 / 动作</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(poseVocab).map(([k, v]) => (
            <Chip key={k} active={poses.includes(k)} onClick={() => toggle(poses, setPoses, k)}>
              {v.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">宽</label>
          <input type="number" className={field} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">高</label>
          <input type="number" className={field} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">步数</label>
          <input type="number" className={field} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">CFG</label>
          <input type="number" step={0.1} className={field} value={guidanceScale} onChange={(e) => setGuidanceScale(Number(e.target.value))} />
        </div>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? "创建中…" : "创建预设"}
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-xs transition-colors ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"
      }`}
    >
      {children}
    </button>
  );
}
