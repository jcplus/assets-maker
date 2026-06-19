"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type StyleBible = {
  style: string;
  material: string;
  lighting: string;
  consistency: string;
  quality: string;
};

type Preset = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  provider: string;
  styleBible: StyleBible;
  negativePrompt: string;
  variableSlots: { angles: string[]; poses: string[]; allowFreeSubject: boolean };
  lockedParams: Record<string, number>;
};

export default function PresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/presets/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setPreset)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl p-6 font-sans">
        <p className="text-muted">未找到该预设。</p>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 返回
        </Link>
      </main>
    );
  }

  if (!preset) {
    return <main className="p-6 text-muted">加载中…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{preset.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {preset.category} · {preset.provider}
          </p>
        </div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 生成台
        </Link>
      </header>

      <div className="space-y-4 text-sm">
        {preset.description && (
          <Field label="描述">{preset.description}</Field>
        )}
        <Field label="🔒 Style Bible（锁定层）">
          <dl className="space-y-2">
            {(
              [
                ["风格 style", preset.styleBible.style],
                ["材质 material", preset.styleBible.material],
                ["光照 lighting", preset.styleBible.lighting],
                ["一致性 consistency", preset.styleBible.consistency],
                ["质量 quality", preset.styleBible.quality],
              ] as const
            ).map(([label, val]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="font-mono text-xs">{val || "—"}</dd>
              </div>
            ))}
          </dl>
        </Field>
        <Field label="负面提示词">
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {preset.negativePrompt || "—"}
          </pre>
        </Field>
        <Field label="变量层词表">
          <p className="text-xs">
            <span className="text-muted">视角：</span>
            {preset.variableSlots.angles.join(", ") || "—"}
          </p>
          <p className="text-xs">
            <span className="text-muted">姿势：</span>
            {preset.variableSlots.poses.join(", ") || "—"}
          </p>
        </Field>
        <Field label="锁定参数">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {Object.entries(preset.lockedParams).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border py-1">
                <dt className="text-muted">{k}</dt>
                <dd className="font-mono">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Field>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-panel p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </h2>
      <div>{children}</div>
    </section>
  );
}
