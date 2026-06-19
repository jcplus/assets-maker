"use client";

import { useEffect, useState } from "react";

type Preset = {
  id: string;
  name: string;
  description?: string;
  category: string;
  promptTemplate: string;
  negativePrompt: string;
  lockedParams: Record<string, number>;
};

type Asset = {
  id: string;
  storageKey: string;
  status: string;
  category: string;
};

function placeholders(tpl: string): string[] {
  return [...new Set([...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
}

export default function GeneratePage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string>("");
  const [health, setHealth] = useState<{ db: boolean; provider: { online: boolean } } | null>(null);

  const sel = presets.find((p) => p.id === selId);

  useEffect(() => {
    fetch("/api/presets").then((r) => r.json()).then((p: Preset[]) => {
      setPresets(p);
      if (p[0]) setSelId(p[0].id);
    });
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  async function generate() {
    if (!sel) return;
    setBusy(true);
    setError("");
    setAssets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: sel.id, variables: vars, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      setAssets(data.assets);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setAssets((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets Maker · 生成台</h1>
        <nav className="flex items-center gap-4 text-sm">
          <a className="underline" href="/library">资产库 →</a>
          {health && (
            <span className="flex gap-2 text-xs">
              <Badge ok={health.db} label="DB" />
              <Badge ok={health.provider.online} label="DrawThings" />
            </span>
          )}
        </nav>
      </header>

      <section className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <label className="block text-sm font-medium">风格预设</label>
          <select
            className="w-full rounded border bg-transparent p-2"
            value={selId}
            onChange={(e) => {
              setSelId(e.target.value);
              setVars({});
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.category}] {p.name}
              </option>
            ))}
          </select>

          {sel && (
            <>
              <p className="text-xs opacity-70">{sel.description}</p>
              <div className="space-y-2">
                {placeholders(sel.promptTemplate).map((ph) => (
                  <div key={ph}>
                    <label className="block text-xs font-medium opacity-80">
                      {ph}
                    </label>
                    <input
                      className="w-full rounded border bg-transparent p-2 text-sm"
                      placeholder={`填 ${ph}…`}
                      value={vars[ph] ?? ""}
                      onChange={(e) =>
                        setVars((v) => ({ ...v, [ph]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium opacity-80">
                  数量 ({count})
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <details className="text-xs opacity-70">
                <summary className="cursor-pointer">锁定参数（防漂移，不可改）</summary>
                <pre className="mt-1 overflow-auto rounded bg-black/20 p-2">
{JSON.stringify(sel.lockedParams, null, 2)}
                </pre>
              </details>

              <button
                onClick={generate}
                disabled={busy}
                className="w-full rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
              >
                {busy ? "生成中…" : `生成 ${count} 张`}
              </button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </div>

        <div>
          {assets.length === 0 ? (
            <p className="pt-10 text-center text-sm opacity-50">
              生成结果会出现在这里 → 挑选 approve 入库
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assets.map((a) => (
                <figure key={a.id} className="overflow-hidden rounded border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${a.storageKey}`}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                  <figcaption className="flex gap-2 p-2 text-xs">
                    <button
                      onClick={() => setStatus(a.id, "approved")}
                      className={`rounded px-2 py-1 ${a.status === "approved" ? "bg-green-600 text-white" : "border"}`}
                    >
                      ✓ 入库
                    </button>
                    <button
                      onClick={() => setStatus(a.id, "rejected")}
                      className={`rounded px-2 py-1 ${a.status === "rejected" ? "bg-red-600 text-white" : "border"}`}
                    >
                      ✗ 弃
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 ${ok ? "bg-green-600/20 text-green-600" : "bg-red-600/20 text-red-500"}`}
    >
      ● {label}
    </span>
  );
}
