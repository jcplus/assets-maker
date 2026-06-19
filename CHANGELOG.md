# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
