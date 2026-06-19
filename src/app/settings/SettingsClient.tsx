"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  PROVIDER_KINDS,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  SECRET_PROVIDERS,
  SECTIONS,
  type ProviderKind,
  type SecretProvider,
  type Settings,
  type SettingsSection,
} from "@/lib/settings";

const field = "w-full rounded border border-border bg-background p-2 text-sm";

function isSection(v: string | null): v is SettingsSection {
  return !!v && SECTIONS.some((s) => s.id === v);
}

export function SettingsClient() {
  const params = useSearchParams();
  const raw = params.get("section");
  // section 从 URL 读取 —— 浏览器前进/后退即可切换，刷新可恢复
  const active: SettingsSection = isSection(raw) ? raw : "provider";

  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: Settings) => setSettings(s))
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl gap-8 p-8">
      {/* section 导航：每项是 Link，走 History API */}
      <nav className="w-48 shrink-0 space-y-1">
        <h1 className="mb-3 px-2 text-lg font-bold">设置</h1>
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={`/settings?section=${s.id}`}
            replace
            className={`block rounded px-3 py-2 text-sm ${
              active === s.id
                ? "bg-accent/10 font-medium text-accent"
                : "text-muted hover:bg-border/40 hover:text-foreground"
            }`}
          >
            {s.label}
            <span className="block text-[11px] font-normal opacity-70">
              {s.desc}
            </span>
          </Link>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {settings === null ? (
          <p className="text-sm text-muted">加载中…</p>
        ) : (
          <SectionForm
            key={active}
            section={active}
            settings={settings}
            onSaved={setSettings}
          />
        )}
      </div>
    </div>
  );
}

function SectionForm({
  section,
  settings,
  onSaved,
}: {
  section: SettingsSection;
  settings: Settings;
  onSaved: (s: Settings) => void;
}) {
  // 各 section 维护一份本地草稿，保存时只 PUT 该 section
  const [draft, setDraft] = useState(settings[section]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(settings[section]);
  }, [settings, section]);

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("保存失败，请检查输入");
      onSaved(data as Settings);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const meta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-bold">{meta.label}</h2>
        <p className="text-sm text-muted">{meta.desc}</p>
      </header>

      <div className="space-y-4">
        {section === "provider" && (
          <Provider draft={draft as Settings["provider"]} set={set as never} />
        )}
        {section === "generation" && (
          <Generation
            draft={draft as Settings["generation"]}
            set={set as never}
          />
        )}
        {section === "appearance" && (
          <Appearance
            draft={draft as Settings["appearance"]}
            set={set as never}
          />
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : "保存"}
        </button>
        {saved && <span className="text-sm text-green-600">已保存 ✓</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

type Setter<T> = <K extends keyof T>(key: K, value: T[K]) => void;

function ModelSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      className={`${field} w-full`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

function ApiKeyField({
  provider,
  draft,
  set,
}: {
  provider: SecretProvider;
  draft: Settings["provider"];
  set: Setter<Settings["provider"]>;
}) {
  const cfg = draft[provider];
  return (
    <Field label="API Key">
      <input
        className={field}
        value={cfg.apiKey}
        onChange={(e) =>
          set(provider, { ...cfg, apiKey: e.target.value })
        }
        placeholder="输入 API Key（保存后仅显示首尾各 6 位）"
        autoComplete="off"
        spellCheck={false}
      />
      <span className="mt-1 block text-[11px] text-muted">
        密钥加密入库且不会回传前端，留空或保持掩码即沿用已保存的密钥。
      </span>
    </Field>
  );
}

function Provider({
  draft,
  set,
}: {
  draft: Settings["provider"];
  set: Setter<Settings["provider"]>;
}) {
  const active = draft.active;
  const isSecret = (SECRET_PROVIDERS as readonly string[]).includes(active);

  return (
    <>
      <Field label="生成服务">
        <select
          className={`${field} w-full`}
          value={active}
          onChange={(e) => set("active", e.target.value as ProviderKind)}
        >
          {PROVIDER_KINDS.map((k) => (
            <option key={k} value={k}>
              {PROVIDER_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      {active === "draw-things" && (
        <>
          <Field label="Draw Things 地址">
            <input
              className={field}
              value={draft.drawThings.url}
              onChange={(e) =>
                set("drawThings", { ...draft.drawThings, url: e.target.value })
              }
              placeholder="http://127.0.0.1:7860"
            />
          </Field>
          <Field label="txt2img 路径">
            <input
              className={field}
              value={draft.drawThings.txt2imgPath}
              onChange={(e) =>
                set("drawThings", {
                  ...draft.drawThings,
                  txt2imgPath: e.target.value,
                })
              }
              placeholder="/sdapi/v1/txt2img"
            />
          </Field>
        </>
      )}

      {active === "ollama" && (
        <>
          <Field label="Ollama 地址">
            <input
              className={field}
              value={draft.ollama.url}
              onChange={(e) =>
                set("ollama", { ...draft.ollama, url: e.target.value })
              }
              placeholder="http://127.0.0.1:11434"
            />
          </Field>
          <Field label="模型">
            <ModelSelect
              value={draft.ollama.model}
              options={PROVIDER_MODELS.ollama}
              onChange={(v) => set("ollama", { ...draft.ollama, model: v })}
            />
          </Field>
        </>
      )}

      {isSecret && (
        <>
          <ApiKeyField
            provider={active as SecretProvider}
            draft={draft}
            set={set}
          />
          <Field label="模型">
            <ModelSelect
              value={draft[active as SecretProvider].model}
              options={PROVIDER_MODELS[active as SecretProvider]}
              onChange={(v) =>
                set(active as SecretProvider, {
                  ...draft[active as SecretProvider],
                  model: v,
                })
              }
            />
          </Field>
        </>
      )}
    </>
  );
}

function Generation({
  draft,
  set,
}: {
  draft: Settings["generation"];
  set: Setter<Settings["generation"]>;
}) {
  const num = (k: keyof Settings["generation"]) => (
    <input
      type="number"
      className={`${field} w-32`}
      value={draft[k]}
      onChange={(e) => set(k, Number(e.target.value))}
    />
  );
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Field label="默认宽度">{num("defaultWidth")}</Field>
      <Field label="默认高度">{num("defaultHeight")}</Field>
      <Field label="默认数量">{num("defaultCount")}</Field>
      <Field label="默认步数">{num("defaultSteps")}</Field>
      <Field label="默认 CFG">{num("defaultGuidanceScale")}</Field>
    </div>
  );
}

function Appearance({
  draft,
  set,
}: {
  draft: Settings["appearance"];
  set: Setter<Settings["appearance"]>;
}) {
  return (
    <Field label="主题">
      <select
        className={`${field} w-48`}
        value={draft.theme}
        onChange={(e) =>
          set("theme", e.target.value as Settings["appearance"]["theme"])
        }
      >
        <option value="system">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </Field>
  );
}
