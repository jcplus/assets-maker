# Assets Maker — 架构方案

> 目标：一个 web 工具，**批量生成风格高度统一的游戏素材**。
> 风格定位（来自 chat.md）：「高光照低分辨率像素景观 / 微缩世界氛围」。
> **第一原则：一致性 > 单张质量。** 整个系统是围绕「对抗风格漂移」设计的。

---

## 0. 核心设计哲学

chat.md 里最关键的一句：**「你不能只靠 prompt，必须固定 generation parameters，否则风格会漂。」**

所以这个工具的真正价值不在「调一次出好图」，而在 **把一套视觉哲学固化成可复用、可批量、可版本化的资产管线**。一切围绕一个核心对象：

> **StylePreset（风格预设）** = 锁定的 prompt 模板 + 锁定的生成参数 + 负向词 + provider 配置。

用户大部分时间不写 prompt，而是「选预设 → 填空 → 批量生成 → 挑选入库」。

---

## 1. 决策摘要（已落地配置）

| 维度 | 选择 | 架构含义 |
|---|---|---|
| 生成后端 | **本地 Draw Things HTTP API**（先本地，将来上云） | `ImageProvider` 抽象层，首发 `DrawThingsProvider`，可扩展 |
| 素材类型 | 全要，但分类 | 4 类：场景 / Tileset / 角色 / 物件，每类独立后处理管线 |
| 部署 | **现在本地，将来 Cloudflare Workers** | 见 §9 Workers 迁移注意 |

### 本地环境配置

```
# Web 服务
PORT=10480

# Draw Things（截图当前是 gRPC@7859；本工具用 HTTP API，需在 App 内切到 HTTP 模式）
DRAW_THINGS_URL=http://127.0.0.1:7860
DRAW_THINGS_TXT2IMG=/sdapi/v1/txt2img

# MySQL
DATABASE_URL="mysql://assetsMaker:assetsMaker@localhost:3306/assetsMaker"
```

> ⚠️ 截图里 Draw Things 选的是 **gRPC（端口 7859）**。本工具走更简单的 **HTTP `/sdapi/v1/txt2img`（默认 7860）**。
> 开发时请在 Draw Things 的「HTTP API 服务器」面板点 **HTTP** 标签启用 HTTP 模式。端口已做成 env 可配。

**关键策略：** 不为「将来多人」过度设计，但每个外部依赖（存储、DB、队列、认证）都走**适配器接口**，使本地实现和云端实现可替换。今天写 SQLite + 本地磁盘，明天换 Postgres + R2，只换实现不动业务代码。

---

## 2. 技术栈推荐

| 层 | 选型 | 理由 |
|---|---|---|
| 全栈框架 | **Next.js (App Router) + TypeScript** | 前后端一体，本地 `next dev` 即可，部署时同一套代码上 Vercel/自托管，平滑迁移到多人 |
| UI | Tailwind + shadcn/ui | 快速搭管理界面 |
| 画布/切图 | HTML Canvas + **Konva**（或 OffscreenCanvas） | Tileset 网格切割、角色去背预览、对齐 |
| 数据库 | **Prisma ORM** + SQLite(本地) → Postgres(云) | 同一份 schema，换 datasource 即迁移 |
| 对象存储 | 适配器：本地 FS → S3/Cloudflare R2 | 素材原图+缩略图 |
| 批量任务 | 适配器：进程内队列 → BullMQ + Redis | 批量生成是异步长任务，必须队列化 |
| 图像后处理 | **sharp**（缩放/裁切/拼图/格式）+ 去背 API | Node 原生快 |
| 认证（后置） | 预留 `AuthProvider` 接口，MVP 用单用户占位 | 上线时接 Auth.js/Clerk |

---

## 3. 领域模型（数据结构）

```
StylePreset            风格预设（系统核心）
 ├─ name, description
 ├─ category           scene | tileset | character | prop
 ├─ provider           openai-image | flux | midjourney ...
 ├─ promptTemplate     带占位符: "cozy pixel art {subject}, {time_of_day} ..."
 ├─ negativePrompt     固定负向词
 ├─ lockedParams       {aspectRatio:"16:9", camera, lighting, colour ...}  ← 防漂移
 └─ referenceImages[]  风格参考图(用于 image-to-image / style ref)

GenerationJob          一次批量生成
 ├─ presetId
 ├─ variables          填进模板的占位符值 + 数量 N
 ├─ status             queued | running | done | failed
 └─ assets[]           产出

Asset                  单个素材
 ├─ jobId, presetId
 ├─ category, tags[]
 ├─ originalUrl, thumbUrl
 ├─ status             draft | approved | rejected   ← 人工挑选入库
 ├─ derivatives[]      后处理产物(去背图/切片/seamless)
 └─ meta               provider 返回的 seed/params(可复现)

AssetCollection        资产集 / 图集(用于导出 spritesheet、tileset atlas)
```

**防漂移的机制落点：** `lockedParams` 和 `negativePrompt` 在预设里冻结，生成时不可被单次任务覆盖（或需要显式「解锁」）。这是把 chat.md 的「固定项」变成代码约束。

---

## 4. Provider 抽象（最重要的扩展点）

```ts
interface ImageProvider {
  id: string;
  generate(req: GenerateRequest): Promise<GenerateResult>; // 文生图
  edit?(req: EditRequest): Promise<GenerateResult>;        // 图生图/局部重绘
  capabilities: { styleRef: boolean; seed: boolean; maxBatch: number };
}
```

首发建议接一家：**Flux（经 fal.ai 或 Replicate）** 或 **OpenAI gpt-image** —— 都有稳定 REST、支持参数化、按张计费透明。`midjourney` 因无官方 API 暂缓（需第三方桥接，留接口位）。

> 注：接 Claude/Anthropic 做 prompt 辅助（如把用户的一句话扩写成符合预设的完整 prompt）属于另一条线，可用 Claude API。本工具的图像生成本身用上面的图像 provider。

---

## 5. 四类素材的后处理管线

| 类型 | 生成方式 | 后处理 |
|---|---|---|
| **场景/背景** | 整张 16:9，直接出 | 仅缩放/调色，入库即用 |
| **Tileset 瓦片** | 按预设生成大图 | Konva 网格切割 → seamless 检测 → 导出 atlas |
| **角色/精灵** | **场景内生成**（chat 建议）或单体生成 | 去背 → 包围盒裁切 → 多帧对齐(可选) |
| **物件/道具** | 单体或成组生成 | 去背 → 裁切 → 打包成 sprite sheet |

每类一个 `PostProcessor` 实现，挂在 Asset 上产出 `derivatives`。

---

## 6. 系统分层

```
┌─────────────────────────────────────────────┐
│  Web UI (Next.js)                            │
│  预设管理 │ 批量生成台 │ 资产库 │ 切图/导出工作台 │
└───────────────┬─────────────────────────────┘
                │ API Routes (Route Handlers)
┌───────────────▼─────────────────────────────┐
│  应用服务层                                    │
│  PresetService │ GenerationService │ AssetSvc │
└──┬──────────┬──────────┬──────────┬──────────┘
   │          │          │          │
┌──▼───┐ ┌────▼────┐ ┌───▼────┐ ┌───▼─────┐
│ DB   │ │ Storage │ │ Queue  │ │ Image   │  ← 全部适配器接口
│适配器 │ │ 适配器  │ │ 适配器 │ │Provider │
└──────┘ └─────────┘ └────────┘ └─────────┘
 SQLite   本地FS      进程内      Flux/OpenAI
  ↓换       ↓换         ↓换
 Postgres  R2/S3      BullMQ
```

业务代码只依赖接口，不依赖具体实现 —— 这就是「本地起步、云端可扩」的落地方式。

---

## 7. 实施路线（分阶段，可增量交付）

**Phase 1 — 能出第一批图（MVP，单人本地）**
- Next.js 骨架 + Prisma/SQLite + 本地存储适配器
- `ImageProvider` 接口 + 接通一家云 API
- StylePreset CRUD + 把 chat.md 的「方案 D + 固定项」做成第一个内置预设
- 批量生成台：选预设 → 填占位符 → 生成 N 张 → 网格预览 → approve/reject 入库
- 进程内队列（先不上 Redis）

**Phase 2 — 资产库与后处理**
- 资产库：分类、标签、搜索、版本
- 去背 + 裁切（角色/物件）
- Tileset 切图工作台（Konva 网格）
- 导出：单图 / sprite sheet / atlas + 元数据 json

**Phase 3 — 一致性增强**
- 风格参考图 / image-to-image，进一步锁风格
- Claude API 辅助：自然语言 → 符合预设的完整 prompt
- 预设「锁定」机制 + 漂移对比视图（并排看新旧图）

**Phase 4 — 多人/上线**
- 换适配器：Postgres + R2 + BullMQ/Redis
- 接 Auth（Auth.js/Clerk）、项目/团队隔离、计费/配额

---

## 9. Cloudflare Workers 迁移注意（将来）

本地用标准 Node + Next.js，但要为将来上 Workers 留意（不为此过度设计）：

| 本地实现 | Workers 实现 | 处理方式 |
|---|---|---|
| 本地文件系统存图 | R2 对象存储 | Storage 适配器隔离，换实现 |
| MySQL 直连 | Hyperdrive + Prisma driver adapter | DATABASE_URL 不变，加 adapter |
| `sharp`（Node 原生，**Workers 不支持**） | WASM 图像库 / Cloudflare Images / 客户端 Canvas | 后处理尽量放客户端 Konva，或迁 WASM |
| Draw Things 本地 API | 上云后换云端图像 provider | Provider 适配器隔离 |
| Next.js Node runtime | `@opennextjs/cloudflare` | 部署期切换 |

**原则：** 所有 Node 原生依赖（fs、sharp）都封在适配器后面，业务层不直接 import。

---

## 8. 仓库结构建议

```
assets-maker/
├─ app/                  # Next.js 路由 + UI
│  ├─ presets/
│  ├─ generate/
│  ├─ library/
│  └─ studio/            # 切图/导出工作台
├─ src/
│  ├─ services/          # 业务逻辑
│  ├─ providers/         # ImageProvider 实现
│  ├─ adapters/          # db / storage / queue / auth
│  ├─ processors/        # 四类后处理管线
│  └─ domain/            # 类型与领域模型
├─ prisma/schema.prisma
└─ presets/              # 内置预设(含 chat.md 的方案D)
```

---

## 待你确认的点
1. 首发图像 provider 选 **Flux(fal.ai/Replicate)** 还是 **OpenAI gpt-image**？（影响接口细节和成本）
2. 是否要我直接开始搭 **Phase 1 骨架**？
