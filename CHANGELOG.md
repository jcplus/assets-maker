# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-06-19

### Added
- **人物四视图模式**: selecting a `character` preset on New Generation now hides the 视角/镜头 selector and locks 生成数量 to 4. On 生成, the server auto-produces a turnaround sheet — 正面 / 左侧面 / 右侧面 / 背面 — by injecting one fixed orientation per image. All four share a single seed and consistency tokens so they render as the same character.

## [0.5.0] - 2026-06-19

### Changed
- **Generation is now a record from the moment it starts.** Clicking 生成 on New Generation no longer polls inline — it creates the job and immediately navigates to `/generation/[id]`. Once started a batch is a real generation entry in the sidebar, so switching pages, closing, or reopening the app returns you to its progress instead of losing it.
- New Generation page is now purely the parameter form (removed the inline split preview grid, preview modal, progress summary, and the "resume active job on load" workaround — the detail page owns the live view now).
- Generation detail page (`/generation/[id]`) now polls live while a job is queued/running: shows a progress bar, fills completed thumbnails incrementally, and renders dashed spinner placeholders for pending images. Polling stops and the sidebar refreshes when the job finishes.

## [0.4.0] - 2026-06-19

### Added
- **Split generation view**: after clicking 生成, the page widens and splits into a left parameter column and a right live preview grid.
- Preview grid renders one slot per requested image: completed images show as clickable thumbnails (with ✓/✗ status badges), pending slots show a gray dashed placeholder with a spinner and "生成中…".
- Clicking a thumbnail opens a preview modal (large image + 入库/弃 actions + 上一张/下一张 navigation); closes on ✕, backdrop click, or Esc.

### Changed
- `GET /api/jobs/[id]` now always returns existing (non-deleted) assets, so the grid can show completed thumbnails incrementally while a job is still running, not only when done.

## [0.3.0] - 2026-06-19

### Added
- **Industrialized layered prompt engine** (`src/lib/prompt-layers.ts`): composes the final prompt in a fixed canonical layer order ([subject]+[pose]+[angle] + Style Bible style/material/lighting/consistency/quality), with case-insensitive token de-duplication. Replaces the unused placeholder engine (`prompt.ts`, removed).
- **Style Bible model**: `StylePreset` now stores locked layers (`styleBible`), an industrial-grade `negativePrompt`, and a controlled-vocabulary `variableSlots` (angles/poses) instead of a single freeform `promptTemplate`.
- Controlled vocabularies for camera angles (front/side/3-4/top-down isometric) and per-category poses/actions; reusable `INDUSTRIAL_NEGATIVE` and `CONSISTENCY_TOKENS` constants.
- Four built-in layered presets (character / building / tile / scene) sharing a common cozy-rural Style Bible base.
- **Server-side prompt composition**: `/api/generate` composes prompt/negative from the preset's Style Bible + chosen variables; client-supplied freeform prompt is no longer trusted, enforcing style consistency.
- **Staged generation**: "同角色换动作/表情" button on the generation detail page reuses a parent asset's seed + subject and injects consistency tokens (txt2img has no img2img, so consistency relies on seed + Style Bible).
- Generation page now shows a read-only locked Style Bible panel, controlled angle/pose dropdowns, optional extra positive/negative, and a live composed-prompt preview.

### Changed
- `PresetForm` and the preset detail page edit/display the layered Style Bible and variable-slot vocabularies.
- `GenerationJob.variables` and `Asset.meta` now store structured variables (subject/angle/pose) plus the composed prompt for reproduction and continuation.

### Removed
- Dead `src/lib/prompt.ts` placeholder engine (`renderPrompt`/`extractPlaceholders`) and the freeform `promptTemplate` field.

## [0.2.2] - 2026-06-19

### Added
- Aspect-ratio lock checkbox at the left of the width/height row on the generation page; locking keeps the current ratio when either dimension changes.
- On opening the generation page, resume polling any in-progress generation (queued/running) detected via `/api/jobs`.

### Changed
- Narrowed the width/height number inputs and prevented their labels from wrapping.
- Removed the `×` separator between the width and height controls.

## [0.2.1] - 2026-06-19

### Changed
- Replaced all browser-native `confirm`/`alert` calls with an in-app `ConfirmModal` component (sidebar delete, sidebar placeholder menu items, trash permanent-delete), per the project rule forbidding native dialogs.

## [0.2.0] - 2026-06-19

### Added
- Hover-revealed vertical "⋮" menu on sidebar Generation/Preset entries with Rename and Delete (red) actions.
- Generation detail page (`/generation/{id}`) and preset detail page (`/preset/{id}`); sidebar and "View all" rows now link to them.
- `PATCH` rename endpoints for jobs and presets, plus `GET` single-preset endpoint.
- Global `cursor: pointer` styling for clickable elements (buttons, links, role="button").

## [0.1.1] - 2026-06-19

### Added
- Versioning rules to agent harness in `AGENTS.md` (requiring `major.minor.patch` versioning format and automatic version & changelog updates upon task completion).

## [0.1.0] - 2026-06-19

### Added
- Redesigned dimension selection with sliders, aspect ratio presets, and improved form validation.
- Asynchronous job polling for asset generation with preset/job management UI components.
- Initialized project with Prisma ORM, asset library page, and base API routes.
