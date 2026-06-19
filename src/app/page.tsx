"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { PresetForm, type Preset } from "@/components/PresetForm";
import { estimateUnits } from "@/lib/estimate";
import {
  ANGLES,
  POSES,
  composePrompt,
  composeNegative,
  type Category,
} from "@/lib/prompt-layers";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function ratio(w: number, h: number): string {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

const field = "w-full rounded border border-border bg-background p-2 text-sm";

type GenDefaults = {
  width: number;
  height: number;
  steps: number;
  guidanceScale: number;
  count: number;
};

export default function GeneratePage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-3xl p-8 text-sm text-muted">加载中…</div>}
    >
      <GeneratePageInner />
    </Suspense>
  );
}

function GeneratePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [genDefaults, setGenDefaults] = useState<GenDefaults | null>(null);
  const [presetId, setPresetId] = useState("");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [newPreset, setNewPreset] = useState(false);

  const [name, setName] = useState("");
  // 变量层（受控词表 + 自由文本）
  const [subject, setSubject] = useState("");
  const [angle, setAngle] = useState("");
  const [pose, setPose] = useState("");
  const [extraPositive, setExtraPositive] = useState("");
  const [extraNegative, setExtraNegative] = useState("");
  const [width, setWidth] = useState(256);
  const [height, setHeight] = useState(256);
  const [count, setCount] = useState(4);
  const [steps, setSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [seed, setSeed] = useState(-1);

  const [lockRatio, setLockRatio] = useState(false);
  const ratioRef = useRef(1);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 加载预设
  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((p: Preset[]) => {
        setPresets(p);
      });
  }, []);

  // 加载用户设置中的生成默认值（New Generation 的初始/重置基准）
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        const g = s?.generation;
        if (!g) return;
        setGenDefaults({
          width: g.defaultWidth,
          height: g.defaultHeight,
          steps: g.defaultSteps,
          guidanceScale: g.defaultGuidanceScale,
          count: g.defaultCount,
        });
      })
      .catch(() => {});
  }, []);

  // 把表单清空回「全新生成」状态，尺寸/步数等取用户设置默认值
  function resetForm(d: GenDefaults) {
    setPresetId("");
    setPreset(null);
    setNewPreset(false);
    setName("");
    setSubject("");
    setAngle("");
    setPose("");
    setExtraPositive("");
    setExtraNegative("");
    setWidth(d.width);
    setHeight(d.height);
    setCount(d.count);
    setSteps(d.steps);
    setGuidanceScale(d.guidanceScale);
    setSeed(-1);
    setLockRatio(false);
    setError("");
  }

  // 依据 URL 参数驱动：带 presetId 则「生成同款」预填；否则重置为全新生成。
  // useSearchParams 对导航变化敏感，所以点侧边栏 New Generation（→ "/"）会触发重置。
  const sp = searchParams.toString();
  useEffect(() => {
    if (presets.length === 0 || !genDefaults) return;
    const pid = searchParams.get("presetId");
    if (!pid) {
      resetForm(genDefaults);
      return;
    }
    const p = presets.find((x) => x.id === pid);
    if (!p) return;

    applyPreset(p);
    const num = (k: string, set: (n: number) => void) => {
      const raw = searchParams.get(k);
      if (raw != null && raw !== "" && !Number.isNaN(Number(raw))) set(Number(raw));
    };
    const str = (k: string, set: (s: string) => void) => {
      const raw = searchParams.get(k);
      if (raw != null) set(raw);
    };
    str("name", setName);
    str("subject", setSubject);
    str("extraPositive", setExtraPositive);
    str("extraNegative", setExtraNegative);
    if (p.category !== "character") str("angle", setAngle);
    str("pose", setPose);
    num("width", setWidth);
    num("height", setHeight);
    if (p.category !== "character") num("count", setCount);
    num("steps", setSteps);
    num("guidanceScale", setGuidanceScale);
    num("seed", setSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, presets, genDefaults]);

  function snap8(n: number): number {
    return Math.max(128, Math.min(1024, Math.round(n / 8) * 8));
  }
  function changeWidth(w: number) {
    setWidth(w);
    if (lockRatio) setHeight(snap8(w / ratioRef.current));
  }
  function changeHeight(h: number) {
    setHeight(h);
    if (lockRatio) setWidth(snap8(h * ratioRef.current));
  }
  function toggleLock() {
    if (!lockRatio && width && height) ratioRef.current = width / height;
    setLockRatio((v) => !v);
  }

  function applyPreset(p: Preset) {
    setPresetId(p.id);
    setPreset(p);
    // 人物：四视图模式 —— 无视角选项、数量锁死 4，角度由服务端逐张注入
    if (p.category === "character") {
      setAngle("");
      setCount(4);
    } else {
      setAngle(p.variableSlots.defaultAngle ?? p.variableSlots.angles[0] ?? "");
    }
    setPose(p.variableSlots.defaultPose ?? p.variableSlots.poses[0] ?? "");
    setExtraPositive("");
    setExtraNegative("");
    setWidth(p.lockedParams.width);
    setHeight(p.lockedParams.height);
    setSteps(p.lockedParams.steps);
    setGuidanceScale(p.lockedParams.guidanceScale);
  }

  // 实时拼装预览：镜像服务端，按规范层序拼装 Style Bible + 变量层
  const category = (preset?.category ?? "scene") as Category;
  const isCharacter = category === "character";
  const composedPrompt = useMemo(
    () =>
      preset
        ? composePrompt(
            preset.styleBible,
            { subject, pose, angle, extraPositive },
            category
          )
        : "",
    [preset, subject, pose, angle, extraPositive, category]
  );
  const composedNegative = useMemo(
    () => (preset ? composeNegative(preset.negativePrompt, extraNegative) : ""),
    [preset, extraNegative]
  );

  const units = estimateUnits({ steps, count, width, height });

  async function generate() {
    if (!presetId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "未命名生成",
          presetId,
          subject,
          angle,
          pose,
          extraPositive,
          extraNegative,
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
      // 任务一旦创建即是一条生成记录：跳转到详情页查看进度，
      // 离开/关闭页面后仍可从 Generations 列表回到这里。
      window.dispatchEvent(new Event("data-updated"));
      router.push(`/generation/${data.jobId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto p-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">New Generation</h1>
      </header>

      <div>
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
              const val = e.target.value;
              if (val === "") {
                setPresetId("");
                setPreset(null);
                return;
              }
              if (val === "__new__") {
                setNewPreset(true);
                return;
              }
              const p = presets.find((x) => x.id === val);
              if (p) applyPreset(p);
            }}
          >
            <option value="">请选择预设方案…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.category}] {p.name}
              </option>
            ))}
            <option value="__new__">+ 新建预设…</option>
          </select>
        </Row>

        {preset && (
          <>
            {/* 变量层：主体（自由文本）+ 角度/姿势（受控词表） */}
            <Row label="主体描述">
              <input
                className={field}
                placeholder="例：a young farmer girl with straw hat"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!preset.variableSlots.allowFreeSubject}
              />
            </Row>
            <div className={isCharacter ? "" : "grid grid-cols-2 gap-3"}>
              {/* 人物为四视图模式，无单一视角选项；视角由服务端逐张注入 */}
              {!isCharacter && (
                <Row label="视角 / 镜头">
                  <select
                    className={field}
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                  >
                    {preset.variableSlots.angles.map((k) => (
                      <option key={k} value={k}>
                        {ANGLES[k]?.label ?? k}
                      </option>
                    ))}
                  </select>
                </Row>
              )}
              <Row label="姿势 / 动作">
                <select
                  className={field}
                  value={pose}
                  onChange={(e) => setPose(e.target.value)}
                >
                  {preset.variableSlots.poses.map((k) => (
                    <option key={k} value={k}>
                      {POSES[category]?.[k]?.label ?? k}
                    </option>
                  ))}
                </select>
              </Row>
            </div>
            {isCharacter && (
              <p className="text-xs text-muted">
                人物模式：将自动生成
                <span className="text-foreground">正面 / 左侧面 / 右侧面 / 背面</span>
                四视图（同一角色，共用 seed）
              </p>
            )}

            {/* Style Bible：锁定层，只读展示，单次生成不可改写 */}
            <details className="rounded border border-border bg-panel/50 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                🔒 Style Bible（锁定 · 强制带到每张资产）
              </summary>
              <dl className="mt-3 space-y-2 text-xs">
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
                    <dd className="font-mono">{val || "—"}</dd>
                  </div>
                ))}
              </dl>
            </details>

            {/* 可选追加 */}
            <details className="rounded border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">追加提示词（可选）</summary>
              <div className="mt-3 space-y-3">
                <Row label="追加正面">
                  <input
                    className={field}
                    value={extraPositive}
                    onChange={(e) => setExtraPositive(e.target.value)}
                  />
                </Row>
                <Row label="追加负面">
                  <input
                    className={field}
                    value={extraNegative}
                    onChange={(e) => setExtraNegative(e.target.value)}
                  />
                </Row>
              </div>
            </details>

            {/* 最终拼装预览（只读） */}
            <Row label="最终提示词预览（服务端拼装）">
              <pre className="max-h-40 overflow-auto rounded border border-border bg-background p-2 text-xs whitespace-pre-wrap font-mono text-muted">
                {composedPrompt || "—"}
                {"\n\n— negative —\n"}
                {composedNegative || "—"}
              </pre>
            </Row>
          </>
        )}

        {/* 宽高 + 比例预览 */}
        <Row label="尺寸 / 比例">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <label
                className="flex items-center self-center pt-4"
                title="锁定当前宽高比"
              >
                <input
                  type="checkbox"
                  checked={lockRatio}
                  onChange={toggleLock}
                  className="h-4 w-4 cursor-pointer accent-accent"
                />
              </label>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted whitespace-nowrap">宽度</span>
                  <input
                    type="number"
                    step={8}
                    className={`${field} w-20`}
                    value={width}
                    onChange={(e) => changeWidth(Number(e.target.value))}
                  />
                </div>
                <input
                  type="range"
                  min={128}
                  max={1024}
                  step={8}
                  value={width}
                  onChange={(e) => changeWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted whitespace-nowrap">高度</span>
                  <input
                    type="number"
                    step={8}
                    className={`${field} w-20`}
                    value={height}
                    onChange={(e) => changeHeight(Number(e.target.value))}
                  />
                </div>
                <input
                  type="range"
                  min={128}
                  max={1024}
                  step={8}
                  value={height}
                  onChange={(e) => changeHeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
              <div className="flex flex-col items-center justify-center min-w-16 pt-4">
                <span className="text-xs text-muted mb-1 font-mono">{ratio(width, height)}</span>
                <div
                  className="border border-border bg-panel flex items-center justify-center overflow-hidden rounded-sm"
                  style={{
                    width: 48,
                    height: 48,
                  }}
                >
                  <div
                    className="border border-accent bg-accent/20 rounded-sm transition-all duration-200"
                    style={{
                      width: width >= height ? 40 : (40 * width) / height,
                      height: height >= width ? 40 : (40 * height) / width,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 常见比例的缩略图 */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "1:1 (正方形)", w: 256, h: 256, iconW: 18, iconH: 18 },
                { label: "16:9 (宽屏)", w: 512, h: 288, iconW: 24, iconH: 13.5 },
                { label: "9:16 (竖屏)", w: 288, h: 512, iconW: 13.5, iconH: 24 },
                { label: "4:3 (标准屏)", w: 384, h: 288, iconW: 21, iconH: 15.75 },
                { label: "3:4 (竖向标准)", w: 288, h: 384, iconW: 15.75, iconH: 21 },
              ].map((item) => {
                const isActive = width === item.w && height === item.h;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setWidth(item.w);
                      setHeight(item.h);
                    }}
                    className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs transition-all hover:bg-panel ${
                      isActive
                        ? "border-accent bg-accent/10 text-accent font-medium shadow-sm"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`border rounded-sm transition-colors flex items-center justify-center w-7 h-7 ${
                        isActive ? "border-accent bg-accent/5" : "border-border bg-panel"
                      }`}
                    >
                      <div
                        className={`border rounded-[1px] transition-all duration-200 ${
                          isActive ? "border-accent bg-accent/25" : "border-muted/50 bg-muted/10"
                        }`}
                        style={{
                          width: item.iconW,
                          height: item.iconH,
                        }}
                      />
                    </div>
                    <div className="text-left leading-tight">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-[10px] opacity-75 font-mono">{item.w} × {item.h}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Row>

        {/* 数量：人物四视图锁死 4 张 */}
        <Row label="生成数量">
          <input
            type="number"
            min={1}
            max={20}
            className={`${field} w-28 disabled:opacity-60`}
            value={isCharacter ? 4 : count}
            disabled={isCharacter}
            title={isCharacter ? "人物模式锁定为四视图（4 张）" : undefined}
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
          disabled={busy || !presetId || !composedPrompt.trim() || !width || !height || !count}
          className="w-full rounded bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "创建中…" : `生成 ${count} 张`}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
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
