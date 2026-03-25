# Types index

This document describes the main TypeScript types defined under `src/types/` (primarily `dcat-types.ts`) and provides JSDoc-style typedefs you can reuse in non-TypeScript contexts.

File: `src/types/dcat-types.ts`

Overview
- These types model common DCAT/DCAT-AP concepts used across the app: catalogs, datasets, distributions, profiles and alignments.
- Types are intentionally permissive in places because incoming DCAT payloads vary in shape.

Type summaries

1) Iri

```ts
/** @typedef {string} Iri */
```

2) Distribution

TypeScript definition (excerpt):

```ts
export interface Distribution {
  id?: Iri;
  accessURL?: string | string[];
  downloadURL?: string | string[];
  title?: string;
  description?: string;
  format?: string | string[];
  mediaType?: string | string[];
  license?: Iri | string;
  issued?: string;
  modified?: string;
  byteSize?: number;
  raw?: any;
}
```

JSDoc typedef (for JS files):

```js
/**
 * @typedef {Object} Distribution
 * @property {Iri} [id]
 * @property {string|string[]} [accessURL]
 * @property {string|string[]} [downloadURL]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string|string[]} [format]
 * @property {string|string[]} [mediaType]
 * @property {Iri|string} [license]
 * @property {string} [issued]
 * @property {string} [modified]
 * @property {number} [byteSize]
 * @property {*} [raw]
 */
```

3) DcatDataset

TypeScript excerpt:

```ts
export interface DcatDataset {
  id: Iri;
  title?: string | Record<string,string>;
  description?: string | Record<string,string>;
  publisher?: Iri | { id?: Iri; name?: string };
  issued?: string;
  modified?: string;
  distribution: Distribution[];
  feedId?: Iri;
  raw?: any;
}
```

JSDoc typedef (key fields shown):

```js
/**
 * @typedef {Object} DcatDataset
 * @property {Iri} id
 * @property {string|Object<string,string>} [title]
 * @property {string|Object<string,string>} [description]
 * @property {Iri|Object} [publisher]
 * @property {string} [issued]
 * @property {string} [modified]
 * @property {Distribution[]} distribution
 * @property {Iri} [feedId]
 * @property {*} [raw]
 */
```

4) DcatCatalog

TypeScript excerpt:

```ts
export interface DcatCatalog {
  id: Iri;
  title?: string | Record<string,string>;
  resources?: Iri[];
  resolvedResources?: Array<CatalogedResource>;
  isLdes?: boolean;
  url?: string;
  raw?: any;
}
```

JSDoc typedef:

```js
/**
 * @typedef {Object} DcatCatalog
 * @property {Iri} id
 * @property {string|Object<string,string>} [title]
 * @property {Iri[]} [resources]
 * @property {Array<DcatDataset|ProfileArtifact|AlignmentArtifact>} [resolvedResources]
 * @property {boolean} [isLdes]
 * @property {string} [url]
 * @property {*} [raw]
 */
```

5) ProfileResourceDescriptor and ProfileArtifact

TS excerpts:

```ts
export interface ProfileResourceDescriptor {
  hasRole?: Iri | string;
  hasArtifact?: Iri | string;
  title?: string;
  format?: string | Iri;
}

export interface ProfileArtifact {
  id: Iri;
  title?: string | Record<string,string>;
  publisher?: Iri | { id?: Iri; name?: string };
  hasResource?: ProfileResourceDescriptor[];
  distributions?: Distribution[];
  raw?: any;
}
```

6) QualityMeasurement

```ts
export interface QualityMeasurement {
  type?: string;
  value?: number | string;
  unit?: string;
  raw?: any;
}
```

7) AlignmentResourceDescriptor and AlignmentArtifact

TS excerpts:

```ts
export interface AlignmentResourceDescriptor {
  title?: string;
  format?: string | Iri;
  conformsTo?: Iri | string;
  hasArtifact?: Iri | string;
  hasRole?: Iri | string;
}

export interface AlignmentArtifact {
  id: Iri;
  title?: string | Record<string,string>;
  sourceProfile?: Iri;
  targetProfile?: Iri;
  quality?: QualityMeasurement[];
  hasResource?: AlignmentResourceDescriptor[];
  raw?: any;
}
```

8) CatalogedResource (union)

```ts
export type CatalogedResource = DcatDataset | ProfileArtifact | AlignmentArtifact;
```

Usage notes
- When writing JS code that consumes these types, copy the JSDoc typedefs above into your JS file so editors like VS Code can provide autocompletion and type hints.
- The TS interfaces are permissive by design; if you rely on stricter invariants at runtime, add runtime checks or narrow the types locally.

If you want, I can generate small example snippets that show how to validate these shapes at runtime (using Zod or io-ts) or provide typed helper functions for common tasks (e.g., `isDcatDataset(obj): obj is DcatDataset`).
