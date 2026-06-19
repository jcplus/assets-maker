"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { PresetForm, type Preset } from "@/components/PresetForm";
import { estimateUnits } from "@/lib/estimate";

type Asset = { id: string; storageKey: string; status: string };

type JobStatus = {
  status: "queued" | "running" | "done" | "failed";
  completed: number;
  count: number;
  progress: number;
  position: number;
  queueTotal: number;
  error: string | null;
  assets: Asset[];
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function ratio(w: number, h: number): string {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

const field = "w-full rounded border border-border bg-background p-2 text-sm";

export default function GeneratePage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [newPreset, setNewPreset] = useState(false);

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576);
  const [count, setCount] = useState(4);
  const [steps, setSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [seed, setSeed] = useState(-1);

  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载预设
  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((p: Preset[]) => {
        setPresets(p);
        if (p[0]) applyPreset(p[0]);
      });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function applyPreset(p: Preset) {
    setPresetId(p.id);
    setPrompt(p.promptTemplate);
    setNegativePrompt(p.negativePrompt);
    setWidth(p.lockedParams.width);
    setHeight(p.lockedParams.height);
    setSteps(p.lockedParams.steps);
    setGuidanceScale(p.lockedParams.guidanceScale);
  }

  const units = estimateUnits({ steps, count, width, height });

  async function generate() {
    if (!presetId) return;
    setBusy(true);
    setError("");
    setJob(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "未命名生成",
          presetId,
          prompt,
          negativePrompt,
          width,
          height,
          count,
          steps,
          guidanceScale,
          seed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成失败");
      poll(data.jobId);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function poll(jobId: string) {
    const fn = async () => {
      const r = await fetch(`/api/jobs/${jobId}`);
      const s: JobStatus = await r.json();
      setJob(s);
      if (s.status === "done" || s.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setBusy(false);
        window.dispatchEvent(new Event("data-updated"));
      }
    };
    fn();
    pollRef.current = setInterval(fn, 1000);
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setJob((j) =>
      j
        ? { ...j, assets: j.assets.map((a) => (a.id === id ? { ...a, status } : a)) }
        : j
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Generation</h1>
        <Link href="/library" className="text-sm text-accent hover:underline">
          资产库 →
        </Link>
      </header>

      <div className="space-y-5">
        {/* 标题 */}
        <Row label="生成标题">
          <input
            className={field}
            placeholder="给这次生成起个名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Row>

        {/* 预设 */}
        <Row label="预设">
          <select
            className={field}
            value={presetId}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setNewPreset(true);
                return;
              }
              const p = presets.find((x) => x.id === e.target.value);
              if (p) applyPreset(p);
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.category}] {p.name}
              </option>
            ))}
            <option value="__new__">+ 新建预设…</option>
          </select>
        </Row>

        {/* 正面 / 负面提示词 */}
        <Row label="正面提示词">
          <textarea
            className={`${field} h-24`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </Row>
        <Row label="负面提示词">
          <textarea
            className={`${field} h-20`}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
          />
        </Row>

        {/* 宽高 + 比例预览 */}
        <Row label="尺寸 / 比例">
          <div className="flex items-center gap-3">
            <input
              type="number"
              className={`${field} w-28`}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            <span className="text-muted">×</span>
            <input
              type="number"
              className={`${field} w-28`}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
            <span className="text-sm text-muted">{ratio(width, height)}</span>
            <div
              className="border border-border bg-panel"
              style={{
                width: 64,
                height: width ? (64 * height) / width : 0,
                maxHeight: 64,
              }}
            />
          </div>
        </Row>

        {/* 数量 */}
        <Row label="生成数量">
          <input
            type="number"
            min={1}
            max={20}
            className={`${field} w-28`}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </Row>

        {/* 高级 */}
        <details className="rounded border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">高级</summary>
          <div className="mt-4 space-y-4">
            <Slider
              label="步数"
              min={1}
              max={100}
              step={1}
              value={steps}
              onChange={setSteps}
            />
            <Slider
              label="Guidance Scale (CFG)"
              min={1}
              max={10}
              step={0.1}
              value={guidanceScale}
              onChange={setGuidanceScale}
            />
            <div>
              <label className="mb-1 block text-xs text-muted">
                Seed（-1 = 随机）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={`${field} w-40`}
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 2_147_483_647))}
                  className="rounded border border-border px-3 py-2 text-sm hover:bg-panel"
                  title="随机种子"
                >
                  🎲
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* 算力估算 */}
        <p className="text-sm text-muted">
          预估算力消耗：<span className="font-medium text-foreground">{units}</span>{" "}
          单位 · 仅为预估，不代表最终消耗
        </p>

        {/* 生成按钮 */}
        <button
          onClick={generate}
          disabled={busy || !presetId}
          className="w-full rounded bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "生成中…" : `生成 ${count} 张`}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* 进度 */}
        {job && <Progress job={job} onStatus={setStatus} />}
      </div>

      {newPreset && (
        <Modal title="新建预设" onClose={() => setNewPreset(false)}>
          <PresetForm
            onCreated={(p) => {
              setNewPreset(false);
              setPresets((prev) => [p, ...prev]);
              applyPreset(p);
              window.dispatchEvent(new Event("data-updated"));
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Progress({
  job,
  onStatus,
}: {
  job: JobStatus;
  onStatus: (id: string, status: string) => void;
}) {
  if (job.status === "failed") {
    return <p className="text-sm text-red-500">生成失败：{job.error}</p>;
  }
  if (job.position > 0) {
    return (
      <p className="text-sm text-muted">
        排队中：前面还有 {job.position} 个 · 队列共 {job.queueTotal} 个
      </p>
    );
  }
  if (job.status !== "done") {
    return (
      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded bg-panel">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          生成中 {job.completed}/{job.count}（{job.progress}%）
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {job.assets.map((a) => (
        <figure key={a.id} className="overflow-hidden rounded border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assets/${a.storageKey}`}
            alt=""
            className="aspect-video w-full object-cover"
          />
          <figcaption className="flex gap-2 p-2 text-xs">
            <button
              onClick={() => onStatus(a.id, "approved")}
              className={`rounded px-2 py-1 ${a.status === "approved" ? "bg-green-600 text-white" : "border border-border"}`}
            >
              ✓ 入库
            </button>
            <button
              onClick={() => onStatus(a.id, "rejected")}
              className={`rounded px-2 py-1 ${a.status === "rejected" ? "bg-red-600 text-white" : "border border-border"}`}
            >
              ✗ 弃
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
