"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Asset = {
  id: string;
  storageKey: string;
  status: string;
  category: string;
  width: number;
  height: number;
};

type Job = {
  id: string;
  name: string;
  status: string;
  count: number;
  completed: number;
  progress: number;
  error?: string | null;
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

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setJob)
      .catch(() => setNotFound(true));
  }, [id]);

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

  return (
    <main className="mx-auto max-w-5xl p-6 font-sans">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {job.status} · {job.completed}/{job.count} · {job.progress}%
          </p>
        </div>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← 生成台
        </Link>
      </header>

      {job.error && (
        <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {job.error}
        </p>
      )}

      {job.assets.length === 0 ? (
        <p className="text-sm text-muted">暂无图片。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {job.assets.map((a) => (
            <figure key={a.id} className="overflow-hidden rounded border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/assets/${a.storageKey}`}
                alt=""
                className="aspect-video w-full object-cover"
              />
              <figcaption className="flex justify-between p-1.5 text-[10px] text-muted">
                <span>{a.category}</span>
                <span>{a.status}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
