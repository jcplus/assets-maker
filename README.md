# Assets Maker

批量生成风格统一的游戏素材。架构见 [PLAN.md](./PLAN.md)。

## 本地运行

```bash
npm install
npx prisma db push      # 建表 (MySQL: assetsMaker@localhost:3306)
npm run db:seed         # 写入内置预设(chat.md 方案D)
npm run dev             # http://localhost:10480
```

## 关键：启用 Draw Things HTTP API

工具调用 Draw Things 的 HTTP `/sdapi/v1/txt2img`（默认 7860）。
打开 Draw Things → 「HTTP API 服务器」面板 → 点 **HTTP** 标签（截图里当前是 gRPC）。
端口不同就改 `.env` 的 `DRAW_THINGS_URL`。

健康状态在生成台右上角：DB / DrawThings 两个绿点。

## 结构

- `src/lib/providers/` — 图像 provider 抽象（首发 DrawThings，可换云）
- `src/lib/services/generation.ts` — 生成任务执行（渲染 prompt → provider → 落盘 → 入库）
- `src/lib/storage.ts` — 存储适配器（本地 FS → 将来 R2）
- `src/lib/db.ts` — Prisma/MySQL
- `src/app/page.tsx` — 生成台；`src/app/library/` — 资产库
- `prisma/schema.prisma` — StylePreset / GenerationJob / Asset

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发，端口 10480 |
| `npm run db:push` | 同步 schema 到 MySQL |
| `npm run db:seed` | 写内置预设 |
| `npm run db:studio` | Prisma Studio 看数据 |
