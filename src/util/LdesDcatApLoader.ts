// ldes-dcatap-materializer.ts
//
// Materialize LDES-DCAT-AP-Feeds (Create/Update/Delete) into a final overview.
// Reuses the existing DCAT-AP processor (DcatApClient + types).
//
// Usage:
//   import { LdesDcatApMaterializer } from "./ldes-dcatap-materializer";
//   const mat = new LdesDcatApMaterializer({ preferLang: ["en","nl","fr"] });
//   const result = await mat.materialize("https://mqa.data.gov.be/ldes/index.trig");
//   console.log(result.items.length);

import {
  DcatApClient,
  // types
  DcatApClientOptions,
  DcatApDatasetItem,
  DcatApDataset,
  DcatApDistribution,
  DistributionsByMediaType,
  RdfDescription,
  RdfTermValue,
  ValueExpandedOrString,
} from "./DcatApLoader"; 

type MaterializedEntry = {
  dataset: DcatApDataset;
  distributions: DcatApDistribution[];
  distributionsByMediaType: DistributionsByMediaType;
};

export type LdesAction = "CREATE" | "UPDATE" | "DELETE" | "UNKNOWN";

export interface LdesMaterializeResult {
  /** materialized final view */
  items: MaterializedEntry[];

  /** map for quick lookups (keyed by dataset IRI string) */
  byId: Map<string, MaterializedEntry>;

  /** dataset IRIs that were deleted */
  deletedIds: Set<string>;

  /** stats */
  stats: {
    pagesProcessed: number;
    create: number;
    update: number;
    delete: number;
    unknown: number;
  };
}

export class LdesDcatApMaterializer {
  private client: DcatApClient;

  constructor(options: DcatApClientOptions = {}) {
    // We reuse your loader so pagination works (TREE/Hydra/headers)
    this.client = new DcatApClient(options);
  }

  /**
   * Materialize an LDES-DCAT-AP feed.
   *
   * Note: We need the action type, but your DcatApClient currently yields only
   * dataset objects. So we infer action by *fetching the page once more* and
   * analyzing ActivityStreams triples. For simplicity, we do that with `fetch()`
   * + a tiny “string contains” approach on TriG/Turtle.
   *
   * If you'd like, we can instead expose `_fetchRdf()` / GraphIndex from the loader
   * to do this properly without extra network calls.
   */
  public async materialize(startUrl: string): Promise<LdesMaterializeResult> {
    const byId = new Map<string, MaterializedEntry>();
    const deletedIds = new Set<string>();

    const stats = {
      pagesProcessed: 0,
      create: 0,
      update: 0,
      delete: 0,
      unknown: 0,
    };

    // We’ll cache action lookups per page to avoid repeated parsing for multiple datasets on same page.
    const pageActionCache = new Map<string, Map<string, LdesAction>>();

    for await (const item of this.client.iterDatasets(startUrl)) {
      stats.pagesProcessed += 0; // incremented per-page below (once)

      // build per-page action map once
      if (!pageActionCache.has(item.pageUrl)) {
        stats.pagesProcessed += 1;
        const m = await this.buildActionMapForPage(item.pageUrl);
        pageActionCache.set(item.pageUrl, m);
      }

      const actionMap = pageActionCache.get(item.pageUrl)!;
      const datasetId = String(item.dataset.id);
      const action = actionMap.get(datasetId) ?? "UNKNOWN";

      applyAction(byId, deletedIds, item, action);

      if (action === "CREATE") stats.create += 1;
      else if (action === "UPDATE") stats.update += 1;
      else if (action === "DELETE") stats.delete += 1;
      else stats.unknown += 1;
    }

    return {
      items: Array.from(byId.values()),
      byId,
      deletedIds,
      stats,
    };
  }

  /**
   * Build a mapping datasetIri -> action for a specific page.
   *
   * Minimal & robust enough for typical LDES-DCAT-AP feeds:
   * - look for `a <...#Create|Update|Delete>`
   * - look for `<...#object> <DATASET_IRI>`
   *
   * Works for TriG/Turtle content. If content is JSON-LD/RDFXML, you’ll want
   * the “proper” graph-based approach (see note above).
   */
  private async buildActionMapForPage(pageUrl: string): Promise<Map<string, LdesAction>> {
    const res = await fetch(pageUrl, {
      headers: {
        Accept: [
          "application/trig",
          "text/turtle",
          "application/n-quads",
          "application/n-triples",
          "application/ld+json",
          "application/rdf+xml",
          "*/*;q=0.1",
        ].join(", "),
      },
    });
    if (!res.ok) return new Map();

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // This “simple version” targets trig/ttl. For JSON-LD/RDFXML, return UNKNOWN.
    if (!(ct.includes("trig") || ct.includes("turtle") || ct.includes("n-quads") || ct.includes("n-triples"))) {
      return new Map();
    }

    const text = await res.text();
    return parseActionMapFromRdfText(text);
  }
}

/** Minimal parser for Create/Update/Delete+object pairs in trig/ttl text */
function parseActionMapFromRdfText(text: string): Map<string, LdesAction> {
  const AS = "https://www.w3.org/ns/activitystreams#";
  const createIri = `${AS}Create`;
  const updateIri = `${AS}Update`;
  const deleteIri = `${AS}Delete`;
  const objectIri = `${AS}object`;

  // Find blocks of the form:
  // <member> a <...Create>; <...object> <dataset> ;
  // We use a conservative regex to find dataset IRIs near object predicate
  const actionMap = new Map<string, LdesAction>();

  const typeRegex = /a\s*<([^>]+)>\s*;/g;
  const objectRegex = new RegExp(`<${objectIri}>\\s*<([^>]+)>`, "g");

  // We do a simple “window scan”: find each occurrence of as:object and look backwards
  // a bit for the nearest as:Create/Update/Delete type.
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let om: RegExpExecArray | null;
    objectRegex.lastIndex = 0;
    while ((om = objectRegex.exec(line))) {
      const datasetIri = om[1];

      // scan a few lines backwards to find a type
      let action: LdesAction = "UNKNOWN";
      for (let j = i; j >= 0 && j >= i - 12; j--) {
        const l = lines[j];
        let tm: RegExpExecArray | null;
        typeRegex.lastIndex = 0;
        while ((tm = typeRegex.exec(l))) {
          const t = tm[1];
          if (t === createIri) action = "CREATE";
          else if (t === updateIri) action = "UPDATE";
          else if (t === deleteIri) action = "DELETE";
          if (action !== "UNKNOWN") break;
        }
        if (action !== "UNKNOWN") break;
      }

      // Prefer DELETE > UPDATE > CREATE if multiple statements appear across the page
      const prev = actionMap.get(datasetIri);
      actionMap.set(datasetIri, pickStronger(prev, action));
    }
  }

  return actionMap;
}

function pickStronger(a?: LdesAction, b?: LdesAction): LdesAction {
  const rank = (x?: LdesAction) =>
    x === "DELETE" ? 3 : x === "UPDATE" ? 2 : x === "CREATE" ? 1 : 0;
  return rank(b) >= rank(a) ? (b ?? "UNKNOWN") : (a ?? "UNKNOWN");
}

/** Apply Create/Update/Delete to materialized state */
function applyAction(
  byId: Map<string, MaterializedEntry>,
  deletedIds: Set<string>,
  item: DcatApDatasetItem,
  action: LdesAction
): void {
  const id = String(item.dataset.id);

  if (action === "DELETE") {
    byId.delete(id);
    deletedIds.add(id);
    return;
  }

  // On create/update we “revive” deleted
  deletedIds.delete(id);

  if (action === "CREATE" || !byId.has(id)) {
    byId.set(id, {
      dataset: item.dataset,
      distributions: item.distributions,
      distributionsByMediaType: item.distributionsByMediaType,
    });
    return;
  }

  // UPDATE: merge into existing
  const prev = byId.get(id)!;

  const mergedDataset = mergeDataset(prev.dataset, item.dataset);
  const mergedDistributions = mergeDistributions(prev.distributions, item.distributions);

  byId.set(id, {
    dataset: mergedDataset,
    distributions: mergedDistributions,
    distributionsByMediaType: groupDistributionsByMediaType(mergedDistributions),
  });
}

/**
 * Merge semantics:
 * - Strings/arrays: if patch provides non-empty value, override; otherwise keep old.
 * - ValueExpandedOrString: merge by taking union for strings, and concat+dedupe for expanded.
 * - raw: deep-merge predicate maps (patch overwrites predicate entries if present).
 *
 * This is intentionally conservative: updates that omit fields will not delete them.
 */
function mergeDataset(base: DcatApDataset, patch: DcatApDataset): DcatApDataset {
  return {
    ...base,
    // keep stable id
    id: base.id,

    title: patch.title ?? base.title,
    description: patch.description ?? base.description,

    identifier: preferNonEmpty(patch.identifier, base.identifier),
    issued: preferNonEmpty(patch.issued, base.issued),
    modified: preferNonEmpty(patch.modified, base.modified),
    landingPage: preferNonEmpty(patch.landingPage, base.landingPage),

    publisher: mergeValueExpandedOrString(base.publisher, patch.publisher),
    creator: preferNonEmpty(patch.creator, base.creator),
    contactPoint: mergeValueExpandedOrString(base.contactPoint, patch.contactPoint),

    theme: preferNonEmpty(patch.theme, base.theme),
    keyword: preferNonEmpty(patch.keyword, base.keyword),
    language: preferNonEmpty(patch.language, base.language),

    temporal: mergeValueExpandedOrString(base.temporal, patch.temporal),
    spatial: mergeValueExpandedOrString(base.spatial, patch.spatial),

    accrualPeriodicity: mergeValueExpandedOrString(base.accrualPeriodicity, patch.accrualPeriodicity),
    conformsTo: mergeValueExpandedOrString(base.conformsTo, patch.conformsTo),

    endpointURL: preferNonEmpty(patch.endpointURL, base.endpointURL),
    endpointDescription: preferNonEmpty(patch.endpointDescription, base.endpointDescription),

    raw: mergeRaw(base.raw, patch.raw),

    // keep feed marker if you set it elsewhere
    feed: patch.feed ?? base.feed,
  };
}

function preferNonEmpty<T>(a: T[], b: T[]): T[] {
  return a && a.length ? a : b;
}

function mergeValueExpandedOrString(a: ValueExpandedOrString, b: ValueExpandedOrString): ValueExpandedOrString {
  const strings = dedupeStrings([...(a?.strings ?? []), ...(b?.strings ?? [])]);
  const expanded = dedupeExpanded([...(a?.expanded ?? []), ...(b?.expanded ?? [])]);
  return { strings, expanded };
}

function dedupeStrings(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function dedupeExpanded(xs: RdfTermValue[]): RdfTermValue[] {
  const out: RdfTermValue[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const key =
      x.type === "iri" ? `i:${x.value}` :
      x.type === "bnode" ? `b:${x.value}` :
      x.type === "literal" ? `l:${x.value}@${x.lang ?? ""}^^${x.datatype ?? ""}` :
      `u:${x.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

function mergeRaw(a: RdfDescription, b: RdfDescription): RdfDescription {
  const out: RdfDescription = { ...(a ?? {}) };
  for (const pred of Object.keys(b ?? {})) {
    // overwrite predicate entry if patch provides it
    out[pred] = b[pred];
  }
  return out;
}

/** Merge distributions by id (patch distributions override provided fields) */
function mergeDistributions(base: DcatApDistribution[], patch: DcatApDistribution[]): DcatApDistribution[] {
  const byId = new Map<string, DcatApDistribution>();
  for (const d of base) byId.set(String(d.id), d);

  for (const d of patch) {
    const id = String(d.id);
    const prev = byId.get(id);

    if (!prev) {
      byId.set(id, d);
      continue;
    }

    byId.set(id, {
      ...prev,
      id: prev.id,

      accessURL: preferNonEmpty(d.accessURL, prev.accessURL),
      downloadURL: preferNonEmpty(d.downloadURL, prev.downloadURL),
      mediaType: preferNonEmpty(d.mediaType, prev.mediaType),
      format: preferNonEmpty(d.format, prev.format),
      license: preferNonEmpty(d.license, prev.license),
      rights: preferNonEmpty(d.rights, prev.rights),
      byteSize: preferNonEmpty(d.byteSize, prev.byteSize),

      raw: mergeRaw(prev.raw, d.raw),
    });
  }

  return Array.from(byId.values());
}

function groupDistributionsByMediaType(dists: DcatApDistribution[]): DistributionsByMediaType {
  const m = new Map<string, DcatApDistribution[]>();
  for (const d of dists) {
    const keys = d.mediaType?.length ? d.mediaType : ["(unknown)"];
    for (const k of keys) {
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
  }
  return Object.fromEntries(m);
}
