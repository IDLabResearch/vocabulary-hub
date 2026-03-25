# Catalog loaders index

This document indexes the loader utilities under `src/util/catalogLoaders/` and documents the exported functions and their behavior.

Common notes
- Most loader modules operate on a DCAT catalog URL or a `DcatCatalog` object (see `src/types/dcat-types.ts`).
- Several functions accept an optional progress callback `onProgress?: (stage: string, payload?: any) => void` that receives lifecycle events.
- Where RDF parsing is required the modules use `fetchRDF` (returns quads) and `n3`'s `Store` to query triples.

---

## catalogLoader.ts

Path: `src/util/catalogLoaders/catalogLoader.ts`

Exports:

- `async function loadCatalog(url: string, onProgress?: ProgressCb): Promise<DcatCatalog>` (default export)

Description:

Attempts to create a lightweight `DcatCatalog` summary for a catalog URL. The function:

- Tries to fetch a feed description via `getFeed(url)` (may provide id/title and whether it's an LDES feed).
- Uses `DcatApClient.iterDatasets(url)` to iterate datasets exposed by the catalog and collect dataset IRIs.
- Falls back to fetching and parsing the raw catalog RDF (`fetchRDF`) and extracting `dcat:resource` triples if the client iteration fails.

Parameters:

- `url: string` — catalog URL to load.
- `onProgress?: (stage: string, payload?: any) => void` — optional progress callback. Observed stages include: `start`, `fetchingFeed`, `parsingCatalog`, `collectingResources`, `loaded`.

Return value:

- Resolves to a `DcatCatalog` with at least `id`, `url`, `resources` (array of resource IRIs), and an `isLdes` flag when identified from feed data.

Notes:

- The function returns a best-effort catalog summary; it intentionally keeps fields minimal (no deep dataset parsing).
- Because it uses external clients and RDF parsing, callers should provide a progress callback to present UI feedback.

---

## extractDatasetsFromCatalog.ts

Path: `src/util/catalogLoaders/extractDatasetsFromCatalog.ts`

Exports:

- `async function extractDatasetsFromCatalog(catalog: DcatCatalog): Promise<DcatDataset[]>` (default export)

Description:

Given a `DcatCatalog`, this function iterates dataset entries exposed by the catalog (via `DcatApClient`) and maps the internal dataset representation to the app's `DcatDataset` shape.

What it extracts:

- `id`, `title`, `description`, `publisher`, `issued`, `modified`, `keyword` and `distribution` information.
- `feedId` and `raw` payload of the dataset (original dataset raw object from the client).

Parameters:

- `catalog: DcatCatalog` — catalog to extract datasets from. The function prefers `catalog.url` falling back to `catalog.id`.

Return value:

- Resolves to an array of `DcatDataset` objects (best-effort mapping).

Notes:

- The function skips datasets that cannot be mapped by `getDatasetObject`.
- Distribution entries are mapped to the `Distribution` shape, preserving `accessURL` and `contentType` where available.

---

## extractAlignmentsFromCatalog.ts

Path: `src/util/catalogLoaders/extractAlignmentsFromCatalog.ts`

Exports:

- `async function extractAlignmentsFromCatalog(catalog: DcatCatalog): Promise<AlignmentArtifact[]>` (default export)

Description:

Parses RDF for each resource in `catalog.resources` and looks for alignment/profile alignment artifacts. It specifically searches for nodes typed as `pmap:ProfileAlignment` or `prof:Profile` and collects relevant metadata.

What it extracts from each matching subject:

- `id`, `title`, `publisher`.
- `sourceProfile` and `targetProfile` (pmap properties).
- Quality measurements (`dqv:hasQualityMeasurement`) collected into `{ type, value }` entries.
- Resource descriptors found via `prof:hasResource` including title, format, artifact IRI and role.
- The raw quads fetched from the resource are attached to the returned `AlignmentArtifact.raw`.

Parameters:

- `catalog: DcatCatalog` — the catalog whose `resources` will be inspected. If `resources` is empty nothing is done.

Return value:

- Resolves to an array of `AlignmentArtifact` objects. Each object contains the extracted metadata and a `raw` property with the parsed quads.

Notes:

- The function is tolerant of per-resource failures (exceptions are caught and ignored so a bad resource won't fail the entire run).
- RDF parsing uses `n3`'s `Store` and `DataFactory` for node matching.

---

## extractProfilesFromCatalog.ts

Path: `src/util/catalogLoaders/extractProfilesFromCatalog.ts`

Exports:

- `async function extractProfilesFromCatalog(catalog: DcatCatalog): Promise<ProfileArtifact[]>` (default export)

Description:

Iterates over `catalog.resources`, fetches RDF and looks for `prof:Profile` subjects. For each profile it extracts the id, title, publisher and `prof:hasResource` descriptors (role, artifact, title).

Parameters:

- `catalog: DcatCatalog` — the catalog with resources to inspect.

Return value:

- Resolves to an array of `ProfileArtifact` objects, each including `hasResource` descriptors and `raw` quads.

Notes:

- Per-resource errors are caught and ignored; the function returns all successfully-parsed profiles.

---

## ldesCatalogLoader.ts

Path: `src/util/catalogLoaders/ldesCatalogLoader.ts`

Exports:

- `async function loadLdesCatalog(url: string, onProgress?: ProgressCb): Promise<DcatCatalog>` (default export)

Description:

Loads an LDES (Linked Data Event Stream) style catalog using `LdesDcatApMaterializer`. This materializer resolves pages and produces materialized dataset items which are used to build the `DcatCatalog`.

Parameters:

- `url: string` — URL to the LDES/LDES-like catalog.
- `onProgress?: (stage: string, payload?: any) => void` — optional progress callback. Observed stages: `start`, `materializing`, `loaded`.

Return value:

- Resolves to a `DcatCatalog` with `resources` derived from the materialized `result.items` (`item.dataset.id` values). The returned catalog will have `isLdes` set to `true` and the `loaded` stage includes `stats` from the materializer result.

Notes:

- Use this loader when the catalog is an LDES/EventStream and you need the materialized view returned by the `LdesDcatApMaterializer` implementation.

---

## Progress callback helper (informal)

Several loaders accept the same `ProgressCb` shape. For convenience, here's a JSDoc-style typedef you can reuse in code examples:

```ts
/**
 * @callback ProgressCb
 * @param {string} stage - Stage name (e.g. 'start', 'materializing', 'fetchingFeed', 'loaded')
 * @param {*} [payload] - Optional payload providing extra information
 */
```

---

If you want this document expanded with example calls and UI integration snippets (e.g. to show live progress), tell me how you prefer to visualize progress and I can add examples.
