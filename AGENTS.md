# Repository Guidelines

## Project Structure & Module Organization
- Extension source sits in `src/`, with one Raycast command per `*.tsx` file (e.g., `src/all-summarize.tsx`). When adding helpers, group them under `src/lib/` to keep commands lean.
- Shared environment types live in `raycast-env.d.ts`; update this when introducing new Raycast APIs.
- UI assets (icons, images) belong in `assets/` and should be exported at 512×512 PNG by default; reference them via `extension-icon.png`.
- Root configs (`tsconfig.json`, `eslint.config.js`) are treated as single sources of truth—mirror their patterns instead of duplicating settings locally.

## Build, Test, and Development Commands
- `npm run dev` starts `ray develop`, opening a live Raycast sandbox for manual QA.
- `npm run build` wraps `ray build`; run before submitting a PR to verify the bundle and type checks.
- `npm run lint` executes the Raycast ESLint suite; gate commits on a clean result.
- `npm run fix-lint` applies safe ESLint autofixes; re-run lint afterward to confirm.
- `npm run publish` leverages `@raycast/api` to submit to the Raycast Store; only use after the build and review pipeline passes.

## Coding Style & Naming Conventions
- TypeScript is required with `strict` mode enabled; prefer explicit return types on exported helpers.
- Follow the Raycast ESLint ruleset and Prettier defaults (2-space indent, double quotes disabled by ESLint). Run `npx prettier --write src/**/*.tsx` before committing substantial edits.
- Name commands using kebab-case filenames (`new-feature.tsx`) and export a default `Command` component returning Raycast UI primitives.

## Testing Guidelines
- No automated test harness exists—exercise new flows via `ray develop`, validating empty, typical, and error states in the Raycast preview.
- Keep logic pure by isolating data helpers in `src/lib/`; this enables future unit tests if the project adopts a runner.
- Document manual test notes in the PR description, calling out required API keys or services.

## Commit & Pull Request Guidelines
- Match the existing Conventional Commit-style prefixes (`feat:`, `fix:`, `init:`); keep subjects under ~72 characters and describe the user-facing impact.
- Group related changes per commit and avoid mixing refactors with feature work without clear justification.
- PRs should include: a concise summary, linked issue (e.g., `Fixes #12`), screenshots or GIFs of the Raycast command if visuals changed, and a checklist confirming lint/build runs.
