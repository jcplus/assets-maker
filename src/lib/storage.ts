import { writeFile, mkdir, readFile, rm } from "fs/promises";
import path from "path";

/**
 * 存储适配器接口。本地实现写文件系统；将来上 Cloudflare 换 R2 实现，
 * 业务层只依赖此接口，不直接 import fs。
 */
export interface StorageAdapter {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  /** 删除（用于回收站真删）。不存在时静默 */
  delete(key: string): Promise<void>;
  /** 浏览器可访问的 URL */
  url(key: string): string;
}

const ASSETS_DIR = process.env.ASSETS_DIR ?? "./data/assets";

class LocalStorage implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<void> {
    const full = path.join(ASSETS_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async get(key: string): Promise<Buffer> {
    return readFile(path.join(ASSETS_DIR, key));
  }
  async delete(key: string): Promise<void> {
    await rm(path.join(ASSETS_DIR, key), { force: true });
  }
  url(key: string): string {
    // 经由 /api/assets/[...key] 路由读出（见 app/api/assets）
    return `/api/assets/${key}`;
  }
}

export const storage: StorageAdapter = new LocalStorage();
