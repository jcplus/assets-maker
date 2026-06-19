"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { PresetForm, type Preset } from "@/components/PresetForm";

type JobRow = {
  id: string;
  name: string;
  status: string;
  assetCount: number;
};

export function Sidebar() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [allJobs, setAllJobs] = useState<JobRow[] | null>(null);
  const [allPresets, setAllPresets] = useState<Preset[] | null>(null);
  const [newPreset, setNewPreset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    fetch("/api/jobs?recent=10")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
    fetch("/api/presets")
      .then((r) => r.json())
      .then((p: Preset[]) => setPresets(p.slice(0, 5)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // 生成完成 / 预设变更后刷新
    window.addEventListener("data-updated", refresh);
    return () => window.removeEventListener("data-updated", refresh);
  }, [refresh]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-panel">
      <nav className="flex-1 space-y-6 overflow-y-auto p-3 text-sm">
        <Link
          href="/"
          className="block rounded bg-accent px-3 py-2 text-center font-medium text-white"
        >
          + New Generation
        </Link>

        <Section
          title="Generations"
          onViewAll={() =>
            fetch("/api/jobs")
              .then((r) => r.json())
              .then(setAllJobs)
          }
        >
          {jobs.length === 0 ? (
            <Empty>暂无生成</Empty>
          ) : (
            jobs.map((j) => (
              <li key={j.id}>
                <span className="block truncate rounded px-2 py-1 hover:bg-border/50">
                  {j.name}{" "}
                  <span className="text-muted">({j.assetCount})</span>
                </span>
              </li>
            ))
          )}
        </Section>

        <Section
          title="Presets"
          onViewAll={() =>
            fetch("/api/presets")
              .then((r) => r.json())
              .then(setAllPresets)
          }
        >
          {presets.length === 0 ? (
            <Empty>暂无预设</Empty>
          ) : (
            presets.map((p) => (
              <li key={p.id}>
                <span className="block truncate rounded px-2 py-1 hover:bg-border/50">
                  {p.name}
                </span>
              </li>
            ))
          )}
        </Section>
      </nav>

      {/* 底部用户区 */}
      <div ref={menuRef} className="relative border-t border-border p-3">
        {menuOpen && (
          <div className="absolute bottom-16 left-3 right-3 z-10 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <Link
              href="/trash"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-panel"
            >
              🗑 Trash
            </Link>
            {["Profile", "Settings", "Help", "Logout"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMenuOpen(false);
                  alert(`${item}（占位，未实现）`);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-panel"
              >
                {item}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-border/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            J
          </span>
          <span className="text-sm font-medium">James</span>
        </button>
      </div>

      {/* View all: Generations */}
      {allJobs && (
        <Modal title="All Generations" wide onClose={() => setAllJobs(null)}>
          {allJobs.length === 0 ? (
            <Empty>暂无生成</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {allJobs.map((j) => (
                <li
                  key={j.id}
                  className="flex justify-between rounded px-2 py-1.5 hover:bg-panel"
                >
                  <span className="truncate">{j.name}</span>
                  <span className="text-muted">
                    {j.status} · {j.assetCount} 图
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* View all: Presets */}
      {allPresets && (
        <Modal title="All Presets" wide onClose={() => setAllPresets(null)}>
          <button
            onClick={() => {
              setAllPresets(null);
              setNewPreset(true);
            }}
            className="mb-3 rounded border border-border px-3 py-1.5 text-sm hover:bg-panel"
          >
            + 新建预设
          </button>
          {allPresets.length === 0 ? (
            <Empty>暂无预设</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {allPresets.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between rounded px-2 py-1.5 hover:bg-panel"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted">{p.category}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {newPreset && (
        <Modal title="新建预设" onClose={() => setNewPreset(false)}>
          <PresetForm
            onCreated={() => {
              setNewPreset(false);
              refresh();
              window.dispatchEvent(new Event("data-updated"));
            }}
          />
        </Modal>
      )}
    </aside>
  );
}

function Section({
  title,
  onViewAll,
  children,
}: {
  title: string;
  onViewAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
      <button
        onClick={onViewAll}
        className="mt-1 px-2 py-1 text-xs text-accent hover:underline"
      >
        View all
      </button>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-2 py-1 text-xs text-muted">{children}</li>;
}
