"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";

type TrashData = {
  presets: { id: string; name: string; category: string }[];
  jobs: { id: string; name: string; status: string; count: number }[];
  assets: { id: string; storageKey: string; category: string }[];
};

type ItemType = "preset" | "job" | "asset";

export default function TrashPage() {
  const [data, setData] = useState<TrashData | null>(null);
  const [purging, setPurging] = useState<{ type: ItemType; id: string } | null>(
    null
  );

  const load = useCallback(() => {
    fetch("/api/trash")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = useCallback(
    async (type: ItemType, id: string, method: "PATCH" | "DELETE") => {
      await fetch("/api/trash", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      load();
      window.dispatchEvent(new Event("data-updated"));
    },
    [load]
  );

  if (!data) return <div className="p-8 text-sm text-muted">加载中…</div>;

  const empty =
    data.presets.length === 0 &&
    data.jobs.length === 0 &&
    data.assets.length === 0;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">回收站</h1>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← New Generation
        </Link>
      </header>

      {empty && <p className="text-sm text-muted">回收站是空的</p>}

      <Group title="Presets">
        {data.presets.map((p) => (
          <Item
            key={p.id}
            primary={p.name}
            secondary={p.category}
            onRestore={() => run("preset", p.id, "PATCH")}
            onDelete={() => setPurging({ type: "preset", id: p.id })}
          />
        ))}
      </Group>

      <Group title="Generations">
        {data.jobs.map((j) => (
          <Item
            key={j.id}
            primary={j.name}
            secondary={`${j.status} · ${j.count} 图`}
            onRestore={() => run("job", j.id, "PATCH")}
            onDelete={() => setPurging({ type: "job", id: j.id })}
          />
        ))}
      </Group>

      <Group title="Assets">
        {data.assets.map((a) => (
          <Item
            key={a.id}
            primary={a.storageKey}
            secondary={a.category}
            onRestore={() => run("asset", a.id, "PATCH")}
            onDelete={() => setPurging({ type: "asset", id: a.id })}
          />
        ))}
      </Group>

      {purging && (
        <ConfirmModal
          title="彻底删除"
          message="彻底删除？此操作不可恢复"
          confirmText="彻底删除"
          danger
          onConfirm={() => run(purging.type, purging.id, "DELETE")}
          onClose={() => setPurging(null)}
        />
      )}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode[];
}) {
  if (children.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function Item({
  primary,
  secondary,
  onRestore,
  onDelete,
}: {
  primary: string;
  secondary: string;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
      <span className="min-w-0 truncate">
        {primary} <span className="text-muted">· {secondary}</span>
      </span>
      <span className="flex shrink-0 gap-2">
        <button
          onClick={onRestore}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-panel"
        >
          恢复
        </button>
        <button
          onClick={onDelete}
          className="rounded bg-red-600 px-2 py-1 text-xs text-white"
        >
          彻底删除
        </button>
      </span>
    </li>
  );
}
