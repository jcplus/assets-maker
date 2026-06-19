"use client";

import { useEffect, useState } from "react";

type Asset = {
  id: string;
  storageKey: string;
  status: string;
  category: string;
};

const CATS = ["", "scene", "tileset", "character", "prop"];
const STATUS = ["", "draft", "approved", "rejected"];

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("approved");

  useEffect(() => {
    const q = new URLSearchParams();
    if (cat) q.set("category", cat);
    if (status) q.set("status", status);
    fetch(`/api/assets?${q}`).then((r) => r.json()).then(setAssets);
  }, [cat, status]);

  return (
    <main className="mx-auto max-w-6xl p-6 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">资产库</h1>
        <a className="text-sm underline" href="/">← 生成台</a>
      </header>

      <div className="mb-4 flex gap-4 text-sm">
        <Select label="分类" value={cat} onChange={setCat} options={CATS} />
        <Select label="状态" value={status} onChange={setStatus} options={STATUS} />
        <span className="self-center opacity-60">{assets.length} 项</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {assets.map((a) => (
          <figure key={a.id} className="overflow-hidden rounded border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/assets/${a.storageKey}`}
              alt=""
              className="aspect-video w-full object-cover"
            />
            <figcaption className="flex justify-between p-1.5 text-[10px] opacity-70">
              <span>{a.category}</span>
              <span>{a.status}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2">
      {label}
      <select
        className="rounded border bg-transparent p-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "全部"}
          </option>
        ))}
      </select>
    </label>
  );
}
