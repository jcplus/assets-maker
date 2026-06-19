"use client";

import { useState } from "react";

export type Preset = {
  id: string;
  name: string;
  description?: string;
  category: string;
  promptTemplate: string;
  negativePrompt: string;
  lockedParams: {
    width: number;
    height: number;
    steps: number;
    guidanceScale: number;
    seed?: number;
  };
};

const CATEGORIES = ["scene", "tileset", "character", "prop"] as const;

const field =
  "w-full rounded border border-border bg-background p-2 text-sm";

/** 无缝新建预设表单。提交成功后回调新建的预设 */
export function PresetForm({
  onCreated,
}: {
  onCreated: (preset: Preset) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("scene");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [steps, setSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !promptTemplate.trim()) {
      setError("名称与提示词必填");
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
          promptTemplate,
          negativePrompt,
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
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">正面提示词（默认）</label>
        <textarea
          className={`${field} h-20`}
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">负面提示词（默认）</label>
        <textarea
          className={`${field} h-16`}
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">宽</label>
          <input
            type="number"
            className={field}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">高</label>
          <input
            type="number"
            className={field}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">步数</label>
          <input
            type="number"
            className={field}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">CFG</label>
          <input
            type="number"
            step={0.1}
            className={field}
            value={guidanceScale}
            onChange={(e) => setGuidanceScale(Number(e.target.value))}
          />
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
