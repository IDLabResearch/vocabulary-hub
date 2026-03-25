# Copilot / AI agent instructions for this repository

Purpose: give an AI coding agent the minimum, high-value context and patterns to be immediately productive in the `vocabulary-hub` UI codebase.

- Repo type: React + TypeScript single-page app built with Vite (frontend-only UI). See `package.json` scripts: `npm run dev`, `npm run build`, `npm run preview`.

- Big picture architecture (what to read first):
  - `src/main.tsx` and `src/App.tsx` — app bootstrap and page routing.
  - `src/stores/FeedStore.tsx` — central state management (React context + reducer) and the canonical place where feed/dataset/profile/pipeline loading logic is orchestrated. Prefer adding feature-level actions here.
  - `src/util/*` — utilities and loaders. In particular:
    - `src/util/DcatApLoader.ts` and `src/util/LdesDcatApLoader.ts` — the low-level DCAT/LDES iterators and materializer (core RDF/data-model code).
    - `src/util/util.ts` — helpers: `getFeed`, `fetchRDF`, `getMembers` and object extractors used throughout loaders.
    - `src/util/catalogLoaders/*` — higher-level loaders that produce `DcatCatalog` and extract datasets/profiles/alignments (see `CATALOG_LOADERS.md`).

- Data flow summary (common pattern to follow when adding features):
  1. UI component calls an action from `useFeedActions()` (from `FeedStore.tsx`).
  2. Action uses `getFeed(url)` to detect feed metadata and chooses between `loadCatalog` or `loadLdesCatalog`.
 3. Catalog loaders use `DcatApClient`/materializer or `fetchRDF` to collect resource IRIs, then call `extractDatasetsFromCatalog`, `extractProfilesFromCatalog` or `extractAlignmentsFromCatalog` to get typed artifacts.
 4. Results are dispatched into the FeedStore reducer using actions like `ADD_DATASETS`, `SET_PROFILES`, `ADD_ALIGNMENTS`.

- Key files & directories to reference when changing behavior:
  - `src/stores/FeedStore.tsx` — add new load actions or change dispatch semantics.
  - `src/util/catalogLoaders/*` — modify parsing/selection logic (supports a `ProgressCb` callback).
  - `src/types/dcat-types.ts` — canonical TS interfaces for DcatDataset, DcatCatalog, ProfileArtifact, AlignmentArtifact. Use these for type hints; JSDoc exists in-source.
  - `src/components/*` — UI pages and smaller components. `src/components/ui/` contains shared UI primitives.

- Conventions and patterns (do not deviate unless intentional):
  - Centralized loading: prefer using `useFeedActions()` / `FeedProvider` rather than ad hoc fetches in components.
  - Loader functions return best-effort, permissive shapes (DCAT payloads are heterogeneous). Keep mapping tolerant and attach `raw` when necessary.
  - Progress callback pattern: catalog loaders accept `onProgress?: (stage, payload?) => void`. Use it for UI progress if adding long-running flows.
  - Avoid mutating store state directly; dispatch actions defined in `FeedStore.tsx`.

- Build / run / debug quick commands (from repo):
  - Start dev server: `npm run dev` (Vite).
  - Production build: `npm run build`.
  - Local preview: `npm run preview`.
  - Type-check manually: `npx tsc --noEmit` (no script provided, useful for static checks).

- External integrations & important dependencies:
  - RDF parsing and manipulation: `n3`, `rdf-parse`, `rdfxml-streaming-parser`.
  - DCAT/LDES processing: `DcatApClient` (in `src/util/DcatApLoader.ts`) and `LdesDcatApMaterializer` (in `src/util/LdesDcatApLoader.ts`).
  - YARRRML mapping: `@rmlio/yarrrml-parser` is included for mapping pipelines.

- Helpful examples for tasks an AI might perform:
  - To add a new feed loader UI: call `useFeedActions().loadDatasetFeed(url)` from a component and rely on existing dispatch logic in `FeedStore.tsx`.
  - To parse a resource for profiles/alignments: reuse `extractProfilesFromCatalog(catalog)` and `extractAlignmentsFromCatalog(catalog)` (they iterate `catalog.resources` and attach `raw` quads).

- What NOT to change lightly:
  - Low-level RDF expansion logic in `DcatApLoader.ts` — it contains parsing contracts relied on by many utilities.
  - The action names and reducer shape in `FeedStore.tsx` unless you update all call sites.

If anything here is unclear or you want more examples (small PR-ready edits, unit-test patterns, or runtime validators), tell me which area to expand and I will update this file. 
