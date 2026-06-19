import { Suspense } from "react";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "设置 · Assets Maker" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">加载中…</div>}>
      <SettingsClient />
    </Suspense>
  );
}
