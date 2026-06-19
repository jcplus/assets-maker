"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ANGLES, POSES, type Category } from "@/lib/prompt-layers";
import { Modal } from "@/components/Modal";

type JobVariables = {
  subject?: string;
  angle?: string;
  pose?: string;
  extraPositive?: string;
  extraNegative?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
};

type Asset = {
  id: string;
  storageKey: string;
  status: string;
  category: string;
  width: number;
  height: number;
  meta?: Record<string, unknown>;
};

type Preset = {
  id: string;
  category: Category;
  variableSlots: { angles: string[]; poses: string[]; allowFreeSubject: boolean };
  lockedParams: { steps: number; guidanceScale: number };
};

type Job = {
  id: string;
  name: string;
  status: string;
  count: number;
  completed: number;
  progress: number;
  error?: string | null;
  presetId: string;
  preset: Preset | null;
  variables: JobVariables | null;
  assets: Asset[];
};

export default function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);
  // 「同角色换动作/表情」：当前展开的资产 + 选中姿势 + 提交态
  const [contId, setContId] = useState<string | null>(null);
  const [contPose, setContPose] = useState("");
  const [contMsg, setContMsg] = useState("");
  const [contBusy, setContBusy] = useState(false);
  // 预览 modal：当前查看的资产
  const [preview, setPreview] = useState<Asset | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${id}`);
        if (!r.ok) throw new Error("not found");
        const data: Job = await r.json();
        setJob(data);
        // 进行中持续轮询；结束后停表并刷新侧边栏计数
        if (data.status === "done" || data.status === "failed") {
          if (timer) clearInterval(timer);
          timer = null;
          window.dispatchEvent(new Event("data-updated"));
        }
      } catch {
        if (!stopped) setNotFound(true);
        if (timer) clearInterval(timer);
        timer = null;
      }
    };

    tick();
    timer = setInterval(tick, 1000);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  async function continueFrom(a: Asset) {
    if (!job?.preset) return;
    setContBusy(true);
    setContMsg("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${job.name} · 同角色`,
          presetId: job.presetId,
          parentAssetId: a.id,
          pose: contPose,
          angle: (a.meta?.angle as string) ?? "",
          width: a.width,
          height: a.height,
          count: 1,
          steps: job.preset.lockedParams.steps,
          guidanceScale: job.preset.lockedParams.guidanceScale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      setContMsg("已发起，去生成台或素材库查看");
      window.dispatchEvent(new Event("data-updated"));
    } catch (e) {
      setContMsg((e as Error).message);
    } finally {
      setContBusy(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-5xl p-6 font-sans">
        <p className="text-muted">未找到该生成。</p>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 返回
        </Link>
      </main>
    );
  }

  if (!job) {
    return <main className="p-6 text-muted">加载中…</main>;
  }

  const running = job.status === "queued" || job.status === "running";
  const pending = running ? Math.max(0, job.count - job.assets.length) : 0;

  const v = job.variables;
  const category = job.preset?.category;
  const angleLabel = v?.angle ? ANGLES[v.angle]?.label ?? v.angle : "";
  const poseLabel =
    v?.pose && category ? POSES[category]?.[v.pose]?.label ?? v.pose : v?.pose ?? "";

  // 「生成同款」：携带本次参数跳转到 New Generation 并自动填充
  const remixHref = (() => {
    const q = new URLSearchParams();
    q.set("presetId", job.presetId);
    q.set("name", `${job.name} 同款`);
    if (v) {
      if (v.subject) q.set("subject", v.subject);
      if (v.angle) q.set("angle", v.angle);
      if (v.pose) q.set("pose", v.pose);
      if (v.extraPositive) q.set("extraPositive", v.extraPositive);
      if (v.extraNegative) q.set("extraNegative", v.extraNegative);
      if (v.width) q.set("width", String(v.width));
      if (v.height) q.set("height", String(v.height));
      if (v.steps) q.set("steps", String(v.steps));
      if (v.guidanceScale != null) q.set("guidanceScale", String(v.guidanceScale));
      if (v.seed != null) q.set("seed", String(v.seed));
    }
    q.set("count", String(job.count));
    return `/?${q.toString()}`;
  })();

  const paramItems: { label: string; value: string }[] = [
    { label: "主体", value: v?.subject || "—" },
    ...(category !== "character" && angleLabel ? [{ label: "视角", value: angleLabel }] : []),
    { label: "姿势", value: poseLabel || "—" },
    { label: "尺寸", value: v?.width && v?.height ? `${v.width} × ${v.height}` : "—" },
    { label: "数量", value: String(job.count) },
    { label: "步数", value: v?.steps != null ? String(v.steps) : "—" },
    { label: "CFG", value: v?.guidanceScale != null ? String(v.guidanceScale) : "—" },
    { label: "Seed", value: v?.seed != null ? String(v.seed) : "—" },
    ...(v?.extraPositive ? [{ label: "追加正面", value: v.extraPositive }] : []),
    ...(v?.extraNegative ? [{ label: "追加负面", value: v.extraNegative }] : []),
  ];

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {job.status} · {job.completed}/{job.count} · {job.progress}%
          </p>
        </div>
        <Link
          href={remixHref}
          className="rounded border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
        >
          生成同款
        </Link>
      </header>

      {/* 生成参数：复现 / 同款的依据 */}
      <section className="mb-6 rounded border border-border bg-panel/40 p-4">
        <h2 className="mb-3 text-sm font-medium">生成参数</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 md:grid-cols-4">
          {paramItems.map((it) => (
            <div key={it.label} className="min-w-0">
              <dt className="text-muted">{it.label}</dt>
              <dd className="break-words font-mono">{it.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {running && (
        <div className="mb-6 space-y-1">
          <div className="h-2 overflow-hidden rounded bg-panel">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            {job.status === "queued" ? "排队中…" : `生成中 ${job.completed}/${job.count}（${job.progress}%）`}
          </p>
        </div>
      )}

      {job.error && (
        <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {job.error}
        </p>
      )}

      {job.assets.length === 0 && !running ? (
        <p className="text-sm text-muted">暂无图片。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {job.assets.map((a) => {
            const poseVocab = job.preset ? POSES[job.preset.category] ?? {} : {};
            const poseKeys = job.preset?.variableSlots.poses ?? [];
            const open = contId === a.id;
            return (
              <figure key={a.id} className="overflow-hidden rounded border border-border">
                <button
                  type="button"
                  onClick={() => setPreview(a)}
                  className="block aspect-square w-full bg-panel/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/assets/${a.storageKey}`}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </button>
                <figcaption className="flex justify-between p-1.5 text-[10px] text-muted">
                  <span>{a.category}</span>
                  <span>{a.status}</span>
                </figcaption>
                {job.preset && poseKeys.length > 0 && (
                  <div className="border-t border-border p-1.5">
                    {open ? (
                      <div className="space-y-1.5">
                        <select
                          className="w-full rounded border border-border bg-background p-1 text-[11px]"
                          value={contPose}
                          onChange={(e) => setContPose(e.target.value)}
                        >
                          {poseKeys.map((k) => (
                            <option key={k} value={k}>
                              {poseVocab[k]?.label ?? k}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          <button
                            disabled={contBusy}
                            onClick={() => continueFrom(a)}
                            className="flex-1 rounded bg-accent px-2 py-1 text-[11px] text-white disabled:opacity-50"
                          >
                            {contBusy ? "…" : "生成"}
                          </button>
                          <button
                            onClick={() => setContId(null)}
                            className="rounded border border-border px-2 py-1 text-[11px]"
                          >
                            取消
                          </button>
                        </div>
                        {contMsg && <p className="text-[10px] text-muted">{contMsg}</p>}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setContId(a.id);
                          setContPose(poseKeys[0] ?? "");
                          setContMsg("");
                        }}
                        className="w-full rounded border border-border px-2 py-1 text-[11px] text-muted hover:text-foreground"
                      >
                        🔁 同角色换动作
                      </button>
                    )}
                  </div>
                )}
              </figure>
            );
          })}
          {Array.from({ length: pending }).map((_, i) => (
            <div
              key={`pending-${i}`}
              className="flex aspect-video flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-panel/50 text-muted"
            >
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
              <span className="text-xs">生成中…</span>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <Modal title={`${preview.category} · ${preview.width}×${preview.height}`} onClose={() => setPreview(null)} wide>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assets/${preview.storageKey}`}
            alt=""
            className="mx-auto max-h-[70vh] w-auto object-contain"
          />
        </Modal>
      )}
    </main>
  );
}
