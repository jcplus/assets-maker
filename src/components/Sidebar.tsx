"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PresetForm, type Preset } from "@/components/PresetForm";
import pkg from "../../package.json";

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
  const [renaming, setRenaming] = useState<{
    kind: "generation" | "preset";
    id: string;
    name: string;
  } | null>(null);
  const [confirming, setConfirming] = useState<{
    kind: "generation" | "preset";
    id: string;
    name: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    fetch("/api/jobs?recent=10")
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => {});
    fetch("/api/presets")
      .then((r) => r.json())
      .then(setPresets)
      .catch(() => {});
  }, []);

  const remove = useCallback(
    async (kind: "generation" | "preset", id: string) => {
      const base = kind === "generation" ? "/api/jobs" : "/api/presets";
      await fetch(`${base}/${id}`, { method: "DELETE" });
      refresh();
      window.dispatchEvent(new Event("data-updated"));
    },
    [refresh]
  );

  const saveRename = useCallback(
    async (kind: "generation" | "preset", id: string, name: string) => {
      const base = kind === "generation" ? "/api/jobs" : "/api/presets";
      await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setRenaming(null);
      refresh();
      window.dispatchEvent(new Event("data-updated"));
    },
    [refresh]
  );

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
          onViewAll={
            jobs.length >= 10
              ? () =>
                  fetch("/api/jobs")
                    .then((r) => r.json())
                    .then(setAllJobs)
              : undefined
          }
        >
          {jobs.length === 0 ? (
            <Empty>暂无生成</Empty>
          ) : (
            jobs.map((j) => (
              <EntryItem
                key={j.id}
                href={`/generation/${j.id}`}
                onRename={() =>
                  setRenaming({ kind: "generation", id: j.id, name: j.name })
                }
                onDelete={() =>
                  setConfirming({ kind: "generation", id: j.id, name: j.name })
                }
              >
                <span className="truncate">
                  {j.name}{" "}
                  <span className="text-muted">({j.assetCount})</span>
                </span>
              </EntryItem>
            ))
          )}
        </Section>

        <Section
          title="Presets"
          onViewAll={
            presets.length >= 5
              ? () =>
                  fetch("/api/presets")
                    .then((r) => r.json())
                    .then(setAllPresets)
              : undefined
          }
        >
          {presets.length === 0 ? (
            <Empty>暂无预设</Empty>
          ) : (
            presets.slice(0, 5).map((p) => (
              <EntryItem
                key={p.id}
                href={`/preset/${p.id}`}
                onRename={() =>
                  setRenaming({ kind: "preset", id: p.id, name: p.name })
                }
                onDelete={() =>
                  setConfirming({ kind: "preset", id: p.id, name: p.name })
                }
              >
                <span className="truncate">{p.name}</span>
              </EntryItem>
            ))
          )}
        </Section>
      </nav>

      {/* 底部用户区 */}
      <div ref={menuRef} className="relative border-t border-border p-3">
        {menuOpen && (
          <div className="absolute bottom-16 left-3 right-3 z-10 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-panel"
            >
              Settings
            </Link>
            <Link
              href="/trash"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-panel"
            >
              Trash
            </Link>
            {["Profile", "Help", "Logout"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMenuOpen(false);
                  setNotice(`${item}（占位，未实现）`);
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
        <div className="mt-1 px-2 text-xs text-muted">v{pkg.version}</div>
      </div>

      {/* View all: Generations */}
      {allJobs && (
        <Modal title="All Generations" wide onClose={() => setAllJobs(null)}>
          {allJobs.length === 0 ? (
            <Empty>暂无生成</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {allJobs.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/generation/${j.id}`}
                    onClick={() => setAllJobs(null)}
                    className="flex justify-between rounded px-2 py-1.5 hover:bg-panel"
                  >
                    <span className="truncate">{j.name}</span>
                    <span className="text-muted">
                      {j.status} · {j.assetCount} 图
                    </span>
                  </Link>
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
                <li key={p.id}>
                  <Link
                    href={`/preset/${p.id}`}
                    onClick={() => setAllPresets(null)}
                    className="flex justify-between rounded px-2 py-1.5 hover:bg-panel"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted">{p.category}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {renaming && (
        <RenameModal
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(name) =>
            saveRename(renaming.kind, renaming.id, name)
          }
        />
      )}

      {confirming && (
        <ConfirmModal
          title="删除"
          message={`确定删除 “${confirming.name}”？`}
          confirmText="删除"
          danger
          onConfirm={() => remove(confirming.kind, confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}

      {notice && (
        <ConfirmModal
          title="提示"
          message={notice}
          onClose={() => setNotice(null)}
        />
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
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-1 px-2 py-1 text-xs text-accent hover:underline"
        >
          View all
        </button>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-2 py-1 text-xs text-muted">{children}</li>;
}

/** 列表条目：可点击进详情，hover 显示竖直三点菜单（Rename / Delete） */
function EntryItem({
  href,
  children,
  onRename,
  onDelete,
}: {
  href: string;
  children: React.ReactNode;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <li ref={ref} className="group relative">
      <Link
        href={href}
        className="flex cursor-pointer items-center rounded px-2 py-1 pr-7 hover:bg-border/50"
      >
        {children}
      </Link>

      <button
        type="button"
        aria-label="更多操作"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted hover:bg-border hover:text-foreground ${
          open ? "flex" : "hidden group-hover:flex"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-1 top-8 z-20 w-36 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
            className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-panel"
          >
            Rename
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-red-500 hover:bg-panel"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/** 重命名弹窗 */
function RenameModal({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();

  return (
    <Modal title="Rename" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
        className="space-y-3 text-sm"
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-border bg-background p-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-border px-3 py-1.5 hover:bg-panel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="cursor-pointer rounded bg-accent px-4 py-1.5 font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
