/**
* dcatap-loader.js
*
* DCAT-AP feed loader with pagination support for:
*  - TREE / LDES (tree:relation / tree:node, and tree:view bootstrapping)
*  - Hydra (hydra:next and hydra:view/hydra:PartialCollectionView)
*  - HTTP Link headers (rel="next")
*
* Outputs “max metadata” per dataset + distribution list per dataset entry.
*
* Works in modern browsers with a bundler (Vite/Webpack/Rollup) and in Node 18+.
*
* Optional dependencies (recommended):
*   npm i n3 jsonld
*   (optional) npm i rdfxml-streaming-parser
*
* Usage:
*   import { DcatApClient } from "./dcatap-loader.js";
*
*   const client = new DcatApClient({
*     preferLang: ["en", "nl", "fr"],
*     dereferenceLinkedResources: false,
*     maxDescribeDepth: 2
*   });
*
*   for await (const item of client.iterDatasets("https://example.org/catalog")) {
*     console.log(item.dataset.title, item.distributions);
*   }
*/

import { Dataset } from "./types";

// Minimal local shapes to avoid depending on external n3 types in this module
// We only need a tiny subset of RDF/JS term/quad structure here.
type TermLike = {
    termType: string;
    value: string;
    datatype?: { value: string };
    language?: string;
} | null;

type QuadLike = {
    subject: TermLike;
    predicate: TermLike;
    object: TermLike;
    graph?: TermLike;
};

type LiteralLike = { value: string; datatype?: { value: string }; language?: string };

const NS = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    dcat: "http://www.w3.org/ns/dcat#",
    dct: "http://purl.org/dc/terms/",
    skos: "http://www.w3.org/2004/02/skos/core#",
    foaf: "http://xmlns.com/foaf/0.1/",
    vcard: "http://www.w3.org/2006/vcard/ns#",
    hydra: "http://www.w3.org/ns/hydra/core#",
    tree: "https://w3id.org/tree#",
    ldes: "https://w3id.org/ldes#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    schema: "http://schema.org/",
    as: "https://www.w3.org/ns/activitystreams#",
};

const U = {
    rdfType: NS.rdf + "type",
    // DCAT
    dcatDataset: NS.dcat + "Dataset",
    dcatCatalog: NS.dcat + "Catalog",
    dcatDatasetProp: NS.dcat + "dataset",
    dcatDistribution: NS.dcat + "distribution",
    dcatDownloadURL: NS.dcat + "downloadURL",
    dcatAccessURL: NS.dcat + "accessURL",
    dcatMediaType: NS.dcat + "mediaType",
    dcatFormat: NS.dcat + "format",
    dcatByteSize: NS.dcat + "byteSize",
    dcatLandingPage: NS.dcat + "landingPage",
    dcatEndpointURL: NS.dcat + "endpointURL",
    dcatEndpointDescription: NS.dcat + "endpointDescription",
    // DCTerms
    dctTitle: NS.dct + "title",
    dctDescription: NS.dct + "description",
    dctIdentifier: NS.dct + "identifier",
    dctIssued: NS.dct + "issued",
    dctModified: NS.dct + "modified",
    dctPublisher: NS.dct + "publisher",
    dctCreator: NS.dct + "creator",
    dctContactPoint: NS.dct + "contactPoint",
    dctLicense: NS.dct + "license",
    dctRights: NS.dct + "rights",
    dctTemporal: NS.dct + "temporal",
    dctSpatial: NS.dct + "spatial",
    dctLanguage: NS.dct + "language",
    dctTheme: NS.dct + "theme",
    dctKeyword: NS.dct + "keyword",
    dctConformsTo: NS.dct + "conformsTo",
    dctAccrualPeriodicity: NS.dct + "accrualPeriodicity",
    
    // Hydra
    hydraNext: NS.hydra + "next",
    hydraView: NS.hydra + "view",
    hydraPartialCollectionView: NS.hydra + "PartialCollectionView",
    
    // TREE / LDES
    treeRelation: NS.tree + "relation",
    treeNode: NS.tree + "node",
    treeView: NS.tree + "view",
    treeMember: NS.tree + "member",
    treeCollection: NS.tree + "Collection",
    ldesEventStream: NS.ldes + "EventStream",
    
    // Activitystreams
    asCreate: NS.as + "Create",
    asUpdate: NS.as + "Update",
    asDelete: NS.as + "Delete",
    asObject: NS.as + "object",
    
    
};

// ---------- Types used across the loader ----------
export type Iri = string;
export type BNodeId = `_:${string}`;
export type SubjectKey = Iri | BNodeId;

export type RdfTermValue =
  | { type: "iri"; value: Iri }
  | { type: "bnode"; value: BNodeId; describe?: RdfDescription | null }
  | { type: "literal"; value: string; lang: string | null; datatype: Iri | null }
  | { type: "unknown"; value: string };

export type RdfDescription = Record<Iri, RdfTermValue[]>;

export type ValueExpandedOrString = {
  strings: string[];          // convenience view
  expanded: RdfTermValue[];   // rich view (bnodes expanded)
};

export interface DcatApDistribution {
  id: Iri | BNodeId;
  accessURL: string[];
  downloadURL: string[];
  mediaType: string[];
  format: string[];
  license: string[];
  rights: string[];
  byteSize: string[];
  raw: RdfDescription;
}

export type DistributionsByMediaType = Record<string, DcatApDistribution[]>;

export interface DcatApDataset {
  id: Iri | BNodeId;
  title: string | null;
  description: string | null;

  identifier: string[];
  issued: string[];
  modified: string[];
  landingPage: string[];

  publisher: ValueExpandedOrString;
  creator: string[];
  contactPoint: ValueExpandedOrString;

  theme: string[];
  keyword: string[];
  language: string[];

  temporal: ValueExpandedOrString;
  spatial: ValueExpandedOrString;

  accrualPeriodicity: ValueExpandedOrString;
  conformsTo: ValueExpandedOrString;

  endpointURL: string[];
  endpointDescription: string[];

  raw: RdfDescription;

  feed?: string;
}

export interface DcatApPageInfo {
  nextUrls: string[];
  relationHints: {
    treeRelations: Array<{
      from: string;
      relation: string;
      node: string;
    }>;
  };
}

export interface DcatApDatasetItem {
  pageUrl: string;
  dataset: DcatApDataset;
  distributions: DcatApDistribution[];
  distributionsByMediaType: DistributionsByMediaType;
  page: DcatApPageInfo;
}

export interface FetchRdfResult {
  url: string;
  graph: GraphIndex;
  headers: Headers;
}

export interface DcatApClientOptions {
  preferLang?: string[];
  dereferenceLinkedResources?: boolean;
  maxPages?: number;
  maxDescribeDepth?: number;
  fetchOptions?: RequestInit;
}

export interface ParseLinkHeaderEntry {
  uri: string | null;
  rels: Set<string>;
  params: Record<string, string>;
}

export interface FindNextUrlsArgs {
  graph: GraphIndex;
  baseUrl: string;
  headers: Headers;
}

export interface FindNextUrlsResult {
  nextUrls: string[];
  relationHints: DcatApPageInfo["relationHints"];
}


const isTreeRelation = (s: string) => s.startsWith(NS.tree) && s.endsWith('Relation')

function isAbsoluteIri(s: string) {
    try {
        // new URL() accepts relative if base missing -> throws, which we want
        new URL(s);
        return true;
    } catch {
        return false;
    }
}

function resolveIri(maybeRelative: string, baseUrl: string): string | null {
    if (!maybeRelative) return null;
    if (typeof maybeRelative !== "string") return null;
    
    // IMPORTANT: don't treat blank nodes as URLs
    if (maybeRelative.startsWith("_:")) return maybeRelative;
    
    if (isAbsoluteIri(maybeRelative)) return maybeRelative;
    try {
        return new URL(maybeRelative, baseUrl).toString();
    } catch {
        return maybeRelative;
    }
}

/** Parse RFC 8288 Link header into [{uri, rels:Set<string>, params:Object}] */
function parseLinkHeader(linkHeader: string, baseUrl: string): ParseLinkHeaderEntry[] {
    if (!linkHeader) return [];
    const parts = linkHeader.split(/,(?=\s*<)/g);
    const out = [];
    for (const part of parts) {
        const m = part.match(/<([^>]+)>\s*(;.*)?$/);
        if (!m) continue;
        const uri = resolveIri(m[1].trim(), baseUrl);
        const paramsStr = (m[2] || "").trim();
        const params: Record<string, string> = {};
        if (paramsStr) {
            const p = paramsStr.split(";").map((x) => x.trim()).filter(Boolean);
            for (const kv of p) {
                const [k, ...rest] = kv.split("=");
                const v = rest.join("=").replace(/^"|"$/g, "");
                params[k] = v;
            }
        }
        const rels = new Set((params.rel || "").split(/\s+/).filter(Boolean));
        out.push({ uri, rels, params });
    }
    return out;
}

/**
* Minimal RDF graph index around RDF/JS terms
* - quads: {subject, predicate, object, graph}
*/
class GraphIndex {
    quads: QuadLike[];
    spo: Map<string, Map<string, TermLike[]>>;
    types: Map<string, Set<string>>

    constructor(quads: QuadLike[] = []) {
        this.quads = quads;
        this.spo = new Map(); // s -> p -> [oTerm]
        this.types = new Map(); // s -> Set(typeIri)
        this._build();
    }
    
    _key(term: TermLike) {
        if (!term) return "";
        if (term.termType === "NamedNode") return term.value;
        if (term.termType === "BlankNode") return "_:" + term.value;
        if (term.termType === "Literal") {
            const dt = term.datatype?.value || "";
            const lang = term.language || "";
            return `"${term.value}"${lang ? "@" + lang : ""}${dt ? "^^" + dt : ""}`;
        }
        return String(term.value ?? term);
    }
    
    _build() {
        for (const q of this.quads) {
            const s = this._key(q.subject);
            const p = this._key(q.predicate);
            if (!this.spo.has(s)) this.spo.set(s, new Map());
            const pm = this.spo.get(s);
            if (!pm || !p) throw new Error('Could not build graph index')
            if (!pm.has(p)) pm.set(p, []);
            (pm.get(p) as TermLike[]).push(q.object);

            const obj = q.object;
            if (p === U.rdfType && obj && (obj as any).termType === "NamedNode") {
                if (!this.types.has(s)) this.types.set(s, new Set());
                (this.types.get(s) as Set<string>).add((obj as any).value);
            }
        }
    }
    
    subjects() {
        return Array.from(this.spo.keys());
    }
    
    predicates(s: string) {
        const pm = this.spo.get(s);
        return pm ? Array.from(pm.keys()) : [];
    }
    
    objects(s: string, p: string) {
        const pm = this.spo.get(s);
        return pm?.get(p) ?? [];
    }
    
    hasType(s: string, typeIri: string) {
        return this.types.get(s)?.has(typeIri) ?? false;
    }
    
    /** Return all (predicateIri -> [terms]) outgoing from sKey */
    outgoing(sKey: string) {
        return this.spo.get(sKey) ?? new Map();
    }
}

function termToValue(term: TermLike | null): RdfTermValue | null {
    if (!term) return null;
    const tt = (term as any).termType;
    if (tt === "NamedNode") return { type: "iri", value: (term as any).value };
    if (tt === "BlankNode") return { type: "bnode", value: `_:${(term as any).value}` };
    if (tt === "Literal") {
        return {
            type: "literal",
            value: (term as any).value,
            lang: (term as any).language || null,
            datatype: (term as any).datatype?.value || null,
        };
    }
    return { type: "unknown", value: String((term as any).value ?? term) };
}

function pickLiteralByLang(literals: TermLike[], preferLang: string[] = []): Extract<RdfTermValue, {type:"literal"}> | null {
    const lits = literals
        .map(termToValue)
        .filter((v): v is Extract<RdfTermValue, {type:"literal"}> => !!v && v.type === "literal");
    
    if (!lits.length) return null;
    if (!preferLang?.length) return lits[0];
    
    // exact language preference first
    for (const lang of preferLang) {
        const hit = lits.find((x) => (x?.lang || "").toLowerCase() === lang.toLowerCase());
        if (hit) return hit;
    }
    
    // fallback: any language-less literal
    const noLang = lits.find((x) => !x?.lang);
    return noLang || lits[0];
}

function valuesAsStrings(terms: TermLike[], baseUrl: string): string[] {
    return terms
    .map(termToValue)
    .map((v) => {
        if (!v) return null as null;
        if (v.type === "iri") return resolveIri(v.value, baseUrl);
        if (v.type === "literal") return v.value;
        if (v.type === "bnode") return v.value;
        return v.value;
    })
    .filter((x): x is string => Boolean(x));
}

function valueExpandedOrString(
  graph: GraphIndex,
  subjectKey: SubjectKey,
  predicateIri: string,
  baseUrl: string,
  opts: Pick<DcatApClientOptions, "maxDescribeDepth">
): ValueExpandedOrString {
    const terms = graph.objects(subjectKey, predicateIri);

    const expanded = terms
    .map((t) => {
        if (!t || typeof t === "string") return null as null;
        const v = termToValue(t as TermLike);
        if (!v) return null;

        if (v.type === "iri") {
            const iri = resolveIri(v.value, baseUrl);
            if (!iri) return null;
            return { ...v, value: iri } as RdfTermValue;
        }

        if (v.type === "bnode") {
            const described = describeResource(graph, v.value, baseUrl, { maxDepth: opts.maxDescribeDepth });
            return { ...v, describe: described } as RdfTermValue;
        }

        // literal / unknown
        return v;
    })
    .filter((x): x is RdfTermValue => !!x);

    // Convenience strings (similar to your old valuesAsStrings)
    const strings = expanded
    .map((v) => {
        if (v.type === "iri") return v.value;
        if (v.type === "literal") return v.value;
        if (v.type === "bnode") return v.value; // keep _:id
        return v.value;
    })
    .filter((x): x is string => Boolean(x));

    return { strings, expanded };
}



/**
* Describe a resource by collecting all outgoing predicates and values.
* - Recursively expands blank nodes up to depth.
*/
function describeResource(
  graph: GraphIndex,
  subjectKey: SubjectKey,
  baseUrl: string,
  opts: { maxDepth?: number } = {}
): RdfDescription {
    const seen = new Set<string>();
    const maxDepth = opts.maxDepth ?? 0;

    function walk(sKey: SubjectKey, depth: number): RdfDescription | null {
        if (!sKey || seen.has(String(sKey))) return null;
        seen.add(String(sKey));

        const out: RdfDescription = {} as any;
        const pm = graph.outgoing(sKey);
        for (const [pred, objs] of pm.entries()) {
            out[pred] = objs.map((t: TermLike) => {
                const v = termToValue(t);
                if (!v) return null as any;
                if (v.type === "iri") {
                    const iri = resolveIri(v.value, baseUrl);
                    if (iri) v.value = iri;
                }
                if (v.type === "bnode" && depth < maxDepth) {
                    const childKey = v.value; // "_:id"
                    const child = walk(childKey as SubjectKey, depth + 1);
                    return { ...v, describe: child } as RdfTermValue;
                }
                return v as RdfTermValue;
            }).filter((x: RdfTermValue | null): x is RdfTermValue => !!x);
        }
        return out;
    }
    return walk(subjectKey, 0) || {};
}

/** Try to extract *all* dataset nodes in a DCAT(-AP) catalog page. */
function findDatasetNodes(graph: GraphIndex): SubjectKey[] { 
    const nodes = new Set<string>();
    
    // typed dcat:Dataset
    for (const s of graph.subjects()) {
        if (graph.hasType(s, U.dcatDataset)) nodes.add(s);
    }
    
    // objects of dcat:dataset from any catalog-ish subject
    for (const s of graph.subjects()) {
        for (const obj of graph.objects(s, U.dcatDatasetProp)) {
            const v = termToValue(obj as TermLike);
            if (!v) continue;
            if (v.type === "iri") nodes.add(v.value);
            if (v.type === "bnode") nodes.add(v.value);
        }
    }
    
    // TREE members sometimes contain the actual entries
    for (const s of graph.subjects()) {
        for (const obj of graph.objects(s, U.treeMember)) {
            const v = termToValue(obj);
            if (!v) continue;
            if (v.type === "iri") nodes.add(v.value);
            if (v.type === "bnode") nodes.add(v.value);
        }
    }
    
    return Array.from(nodes);
}

function extractDistributions(
  graph: GraphIndex,
  datasetKey: SubjectKey,
  baseUrl: string,
  opts: Pick<DcatApClientOptions, "maxDescribeDepth">
): { distributions: DcatApDistribution[]; distributionsByMediaType: DistributionsByMediaType } {
    const distTerms = graph.objects(datasetKey, U.dcatDistribution);
    const distKeys = distTerms
    .map((t) => termToValue(t as TermLike))
    .map((v) => (v && (v.type === "iri" || v.type === "bnode") ? v.value : null))
    .filter((x): x is string => Boolean(x));
    
    const dists = distKeys.map((dKey) => {
        const raw = describeResource(graph, dKey, baseUrl, { maxDepth: opts.maxDescribeDepth });
        
        const accessURL = valuesAsStrings(graph.objects(dKey, U.dcatAccessURL), baseUrl);
        const downloadURL = valuesAsStrings(graph.objects(dKey, U.dcatDownloadURL), baseUrl);
        
        const mediaType = valuesAsStrings(graph.objects(dKey, U.dcatMediaType), baseUrl);
        const format = valuesAsStrings(graph.objects(dKey, U.dcatFormat), baseUrl);
        
        const license = valuesAsStrings(graph.objects(dKey, U.dctLicense), baseUrl);
        const rights = valuesAsStrings(graph.objects(dKey, U.dctRights), baseUrl);
        
        const byteSize = valuesAsStrings(graph.objects(dKey, U.dcatByteSize), baseUrl);
        
        return {
            id: (resolveIri(dKey, baseUrl) ?? dKey) as Iri | BNodeId,
            accessURL,
            downloadURL,
            mediaType,
            format,
            license,
            rights,
            byteSize,
            raw,
        };
    });
    
    // “Different distributions available”: return all, but also precompute a handy grouping.
    const byMediaType = new Map<string, DcatApDistribution[]>();
    for (const d of dists) {
        const keys = d.mediaType?.length ? d.mediaType : ["(unknown)"];
        for (const k of keys) {
            if (!byMediaType.has(k)) byMediaType.set(k, []);
            byMediaType.get(k)!.push(d);
        }
    }
    
    return { distributions: dists, distributionsByMediaType: Object.fromEntries(byMediaType) };
}

/**
* Extract a “maximal” dataset object:
* - common DCAT/DCAT-AP fields mapped to friendly keys
* - plus `raw` for everything outgoing from the dataset node (incl. expanded bnodes)
*/
function buildDatasetObject(
  graph: GraphIndex,
  datasetKey: SubjectKey,
  baseUrl: string,
  opts: DcatApClientOptions
): DcatApDataset { 
    const raw = describeResource(graph, datasetKey, baseUrl, { maxDepth: opts.maxDescribeDepth });
    
    const title = pickLiteralByLang(graph.objects(datasetKey, U.dctTitle), opts.preferLang)?.value ?? null;
    const description =
    pickLiteralByLang(graph.objects(datasetKey, U.dctDescription), opts.preferLang)?.value ?? null;
    
    const identifier = valuesAsStrings(graph.objects(datasetKey, U.dctIdentifier), baseUrl);
    
    const id =
    (typeof datasetKey === "string" && datasetKey.startsWith("_:"))
    ? (identifier[0] ?? datasetKey) // prefer dct:identifier if present
    : (resolveIri(datasetKey, baseUrl) ?? datasetKey);
    
    const issued = valuesAsStrings(graph.objects(datasetKey, U.dctIssued), baseUrl);
    const modified = valuesAsStrings(graph.objects(datasetKey, U.dctModified), baseUrl);
    const landingPage = valuesAsStrings(graph.objects(datasetKey, U.dcatLandingPage), baseUrl);
    const creator = valuesAsStrings(graph.objects(datasetKey, U.dctCreator), baseUrl);
    const theme = valuesAsStrings(graph.objects(datasetKey, U.dctTheme), baseUrl);
    const keyword = valuesAsStrings(graph.objects(datasetKey, U.dctKeyword), baseUrl);
    const language = valuesAsStrings(graph.objects(datasetKey, U.dctLanguage), baseUrl);
    const accrualPeriodicity = valuesAsStrings(graph.objects(datasetKey, U.dctAccrualPeriodicity), baseUrl);
    
    const temporal = valueExpandedOrString(graph, datasetKey, U.dctTemporal, baseUrl, opts);
    const spatial = valueExpandedOrString(graph, datasetKey, U.dctSpatial, baseUrl, opts);
    const conformsTo = valueExpandedOrString(graph, datasetKey, U.dctConformsTo, baseUrl, opts);
    const publisher = valueExpandedOrString(graph, datasetKey, U.dctPublisher, baseUrl, opts);
    const contactPoint = valueExpandedOrString(graph, datasetKey, U.dctContactPoint, baseUrl, opts);
    
    
    // Helpful “API-like” hints if present
    const endpointURL = valuesAsStrings(graph.objects(datasetKey, U.dcatEndpointURL), baseUrl);
    const endpointDescription = valuesAsStrings(graph.objects(datasetKey, U.dcatEndpointDescription), baseUrl);
    return {
        // id: resolveIri(datasetKey, baseUrl),
        id,
        title,
        description,
        identifier,
        issued,
        modified,
        landingPage,
        
        publisher,
        creator: valuesAsStrings(graph.objects(datasetKey, U.dctCreator), baseUrl),
        contactPoint,
        
        theme: valuesAsStrings(graph.objects(datasetKey, U.dctTheme), baseUrl),
        keyword: valuesAsStrings(graph.objects(datasetKey, U.dctKeyword), baseUrl),
        language: valuesAsStrings(graph.objects(datasetKey, U.dctLanguage), baseUrl),
        
        temporal,
        spatial,
        accrualPeriodicity: valueExpandedOrString(graph, datasetKey, U.dctAccrualPeriodicity, baseUrl, opts),
        conformsTo,
        
        endpointURL: valuesAsStrings(graph.objects(datasetKey, U.dcatEndpointURL), baseUrl),
        endpointDescription: valuesAsStrings(graph.objects(datasetKey, U.dcatEndpointDescription), baseUrl),
        
        raw,
    };
    
}

/**
* Find next-page candidates using:
*  1) HTTP Link header rel=next
*  2) Hydra triples (hydra:next, hydra:view/hydra:next)
*  3) TREE/LDES triples (tree:relation/tree:node; and tree:view bootstrapping)
*
* Returns { nextUrls: string[], relationHints: any }
*/
function findNextUrls({ graph, baseUrl, headers }: FindNextUrlsArgs): FindNextUrlsResult {

    const nextUrls: string[] = [];
    const relationHints: DcatApPageInfo["relationHints"] = { treeRelations: [] };
    
    // 1) HTTP Link header
    const link = headers?.get?.("Link") || headers?.get?.("link") || null;
    if (link) {
        for (const l of parseLinkHeader(link, baseUrl)) {
            if (l.rels.has("next") || l.rels.has(U.hydraNext) || l.rels.has(NS.hydra + "next")) {
                if (l.uri) nextUrls.push(l.uri);
            }
        }
    }
    
    // 2) Hydra: direct hydra:next anywhere
    for (const s of graph.subjects()) {
        for (const o of graph.objects(s, U.hydraNext)) {
            const v = termToValue(o as TermLike);
            if (v?.type === "iri") {
                const iri = resolveIri(v.value, baseUrl);
                if (iri) nextUrls.push(iri);
            }
        }
    }
    
    // Hydra: hydra:view -> hydra:next
    for (const s of graph.subjects()) {
        for (const view of graph.objects(s, U.hydraView)) {
            const vv = termToValue(view);
            if (!vv) continue;
            const viewKey = vv.type === "iri" ? vv.value : vv.type === "bnode" ? vv.value : null;
            if (!viewKey) continue;
            for (const n of graph.objects(viewKey, U.hydraNext)) {
                const nv = termToValue(n as TermLike);
                if (nv?.type === "iri") {
                    const iri = resolveIri(nv.value, baseUrl);
                    if (iri) nextUrls.push(iri);
                }
            }
        }
    }
    
    // TREE: follow tree:view links as additional “next” candidates
    for (const s of graph.subjects()) {
        for (const v of graph.objects(s, U.treeView)) {
            const vv = termToValue(v as TermLike);
            if (vv?.type === "iri") {
                const iri = resolveIri(vv.value, baseUrl);
                if (iri) nextUrls.push(iri);
            }
        }
    }
    
    // 3) TREE/LDES: tree:relation/tree:node from likely view/node subjects
    const relSubjects = new Set<string>();
    for (const s of graph.subjects()) {
        if (graph.objects(s, U.treeRelation).length) relSubjects.add(s);
    }
    
    for (const s of relSubjects) {
        for (const rel of graph.objects(s, U.treeRelation)) {
            const rv = termToValue(rel as TermLike);
            const relKey = rv && (rv.type === "bnode" || rv.type === "iri") ? rv.value : null;
            if (!relKey) continue;
            
            const nodes = graph.objects(relKey, U.treeNode)
                .map((t) => termToValue(t as TermLike))
                .filter((x: RdfTermValue | null): x is RdfTermValue => !!x);
            for (const n of nodes) {
                if (n.type === "iri") {
                    const nodeIri = resolveIri(n.value, baseUrl);
                    const fromIri = resolveIri(s, baseUrl);
                    if (nodeIri) nextUrls.push(nodeIri);
                    if (nodeIri && fromIri) {
                        relationHints.treeRelations.push({
                            from: fromIri,
                            relation: relKey,
                            node: nodeIri,
                        });
                    }
                }
            }
        }
    }
    
    // De-dupe while preserving order
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const u of nextUrls) {
        if (!u) continue;
        if (seen.has(u)) continue;
        seen.add(u);
        deduped.push(u);
    }

    return { nextUrls: deduped, relationHints };
}

/**
* If the user starts from an LDES EventStream IRI, the first response might only
* describe the stream and point to its view using tree:view. This function finds
* a “first page” candidate from tree:view.
*/
function findTreeViewBootstrap(graph: GraphIndex, baseUrl: string): string[] {
    const candidates = [];
    for (const s of graph.subjects()) {
        if (graph.hasType(s, U.ldesEventStream) || graph.hasType(s, U.treeCollection)) {
            for (const v of graph.objects(s, U.treeView)) {
                const vv = termToValue(v);
                if (vv?.type === "iri") candidates.push(resolveIri(vv.value, baseUrl));
            }
        }
    }
    // also allow any tree:view anywhere (best effort)
    if (!candidates.length) {
        for (const s of graph.subjects()) {
            for (const v of graph.objects(s, U.treeView)) {
                const vv = termToValue(v);
                if (vv?.type === "iri") candidates.push(resolveIri(vv.value, baseUrl));
            }
        }
    }
    const filtered = candidates.filter((x): x is string => Boolean(x));
    return [...new Set(filtered)];
}

async function ensureParsers() {
    // We use dynamic imports so the same file can be used in browsers with bundlers.
    let N3 = null;
    try {
        N3 = await import("n3");
    } catch {
        // no-op
    }
    let jsonld = null;
    try {
        jsonld = await import("jsonld");
    } catch {
        // no-op
    }
    let rdfxmlParser = null;
    try {
        rdfxmlParser = await import("rdfxml-streaming-parser");
    } catch {
        // no-op
    }
    return { N3, jsonld, rdfxmlParser };
}

async function parseRdf(response: Response, url: string): Promise<QuadLike[]> {
    const ct = (response.headers.get("content-type") || "").toLowerCase();
    const { N3, jsonld, rdfxmlParser } = await ensureParsers();
    
    // JSON-LD
    if (ct.includes("application/ld+json") || ct.includes("application/json") || ct.includes("+json")) {
        const text = await response.text();
        if (!jsonld || !N3) {
            throw new Error("Parsing JSON-LD requires optional dependencies: `jsonld` and `n3`.");
        }
        const doc = JSON.parse(text);
        const nquads = await jsonld.default.toRDF(doc, { format: "application/n-quads", base: url });
        const parser = new N3.Parser({ format: "N-Quads", baseIRI: url });
        return parser.parse(nquads);
    }
    
    // RDF/XML (stream if possible)
    if (ct.includes("rdf+xml") || ct.includes("application/xml") || ct.includes("text/xml")) {
        if (!rdfxmlParser) {
            throw new Error("Parsing RDF/XML requires optional dependency: `rdfxml-streaming-parser`.");
        }
        
        const { RdfXmlParser } = rdfxmlParser;
        const parser = new RdfXmlParser({ baseIRI: url });
            const quads: QuadLike[] = [];
        
        await new Promise((resolve, reject) => {
            parser.on("data", (q: any) => quads.push(q));
            parser.on("error", reject);
            parser.on("end", resolve);
            
            // Browser ReadableStream
            if (response.body && typeof response.body.getReader === "function") {
                const reader = response.body.getReader();
                (async () => {
                    try {
                        for (;;) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            parser.write(value); // Uint8Array is OK
                        }
                        parser.end();
                    } catch (e) {
                        reject(e);
                    }
                })();
                return;
            }
            
            // Fallback: read as text (only if we can't stream)
            (async () => {
                try {
                    const text = await response.text();
                    parser.write(text);
                    parser.end();
                } catch (e) {
                    reject(e);
                }
            })();
        });
        
        return quads;
    }
    
    // Turtle / TriG / N-Triples / N-Quads (default)
    if (!N3) {
        throw new Error("Parsing Turtle/N-Triples requires optional dependency: `n3`.");
    }
    
    const text = await response.text();
    const format =
    ct.includes("trig") ? "application/trig" :
    ct.includes("n-quads") ? "N-Quads" :
    ct.includes("n-triples") ? "N-Triples" :
    ct.includes("turtle") ? "text/turtle" :
    undefined;
    
    const parser = new N3.Parser({ format, baseIRI: url });
    return parser.parse(text);
}
export class DcatApClient {
  private _cache: Map<string, FetchRdfResult>;
  public options: Required<Omit<DcatApClientOptions, "fetchOptions">> & { fetchOptions: RequestInit };

  constructor(options: DcatApClientOptions = {}) {
    this.options = {
      preferLang: options.preferLang ?? ["en"],
      dereferenceLinkedResources: options.dereferenceLinkedResources ?? false,
      maxPages: options.maxPages ?? 1000,
      maxDescribeDepth: options.maxDescribeDepth ?? 2,
      fetchOptions: options.fetchOptions ?? {},
    };
    this._cache = new Map();
  }

  private async _fetchRdf(url: string): Promise<FetchRdfResult> {
    if (this._cache.has(url)) return this._cache.get(url)!;

    const res = await fetch(url, {
      ...this.options.fetchOptions,
      headers: {
        Accept: [
          "application/ld+json",
          "text/turtle",
          "application/n-quads",
          "application/n-triples",
          "application/trig",
          "application/rdf+xml",
          "application/xml;q=0.8",
          "*/*;q=0.1",
        ].join(", "),
        ...(this.options.fetchOptions.headers || {}),
      },
    });

    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);

    const quads = await parseRdf(res, url);
    const graph = new GraphIndex(quads);
    const value: FetchRdfResult = { url, graph, headers: res.headers };
    this._cache.set(url, value);
    return value;
  }

  public async *iterDatasets(startUrl: string): AsyncGenerator<DcatApDatasetItem, void, void> {
    const visitedPages = new Set<string>();
    const queue: string[] = [startUrl];
    let pagesFetched = 0;

    while (queue.length) {
      const pageUrl = queue.shift();
      if (!pageUrl || visitedPages.has(pageUrl)) continue;

      visitedPages.add(pageUrl);
      pagesFetched += 1;
      if (pagesFetched > this.options.maxPages) break;

      const { graph, headers } = await this._fetchRdf(pageUrl);

      const bootstrapViews = findTreeViewBootstrap(graph, pageUrl);

      const ldesMode =
        graph.subjects().some((s) => graph.hasType(s, U.ldesEventStream)) ||
        graph.subjects().some((s) => graph.objects(s, U.treeMember).length > 0);

      const datasetNodes = ldesMode ? findLdesCreateDatasetObjects(graph) : findDatasetNodes(graph);

      for (const v of bootstrapViews) {
        if (v && !visitedPages.has(v) && !queue.includes(v)) queue.push(v);
      }

      const pagePagination = findNextUrls({ graph, baseUrl: pageUrl, headers });

      for (const datasetKey of datasetNodes) {
        const dataset = buildDatasetObject(graph, datasetKey, pageUrl, this.options);
        const { distributions, distributionsByMediaType } = extractDistributions(
          graph,
          datasetKey,
          pageUrl,
          this.options
        );

        yield {
          pageUrl,
          dataset,
          distributions,
          distributionsByMediaType,
          page: pagePagination,
        };
      }

      for (const next of pagePagination.nextUrls) {
        if (next && !visitedPages.has(next)) queue.push(next);
      }
    }
  }

  public async loadAllDatasets(startUrl: string): Promise<DcatApDatasetItem[]> {
    const out: DcatApDatasetItem[] = [];
    for await (const x of this.iterDatasets(startUrl)) out.push(x);
    return out;
  }
}

export function getPropertyStringValue(
  item: unknown
): string {
  if (typeof item === "string") return item;
  if (Array.isArray(item)) return item.filter((x) => typeof x === "string").join(", ");

  // ValueExpandedOrString
  if (item && typeof item === "object" && "strings" in item) {
    const v = item as ValueExpandedOrString;
    return v.strings.join(", ");
  }

  return "";
}

export function printDcatEntry(item: DcatApDatasetItem): void {
  console.log("Dataset IRI:", item.dataset.id);

  for (const key of Object.keys(item.dataset) as Array<keyof DcatApDataset>) {
    if (key !== "id" && key !== "raw") {
      const s = getPropertyStringValue(item.dataset[key]);
      if (s) console.log(`${key}:`, s);
    }
  }

  for (const d of item.distributions) {
    console.log("  - dist:", d.id);
    for (const key of Object.keys(d) as Array<keyof DcatApDistribution>) {
      if (key !== "id" && key !== "raw") {
        const s = getPropertyStringValue(d[key]);
        if (s) console.log(`    ${key}: ${s}`);
      }
    }
  }
}

function findLdesCreateDatasetObjects(graph: GraphIndex): SubjectKey[] {
    // Find member activity nodes via tree:member
    const memberActivities: string[] = [];
    for (const s of graph.subjects()) {
        for (const o of graph.objects(s, U.treeMember)) {
            const v = termToValue(o);
            if (!v) continue;
            if (v.type === "iri") memberActivities.push(v.value);
            if (v.type === "bnode") memberActivities.push(v.value);
        }
    }
    
    const datasetKeys = new Set<string>();
    
    for (const act of memberActivities) {
        // Only Create (per your requirement)
        if (!graph.hasType(act, U.asCreate)) continue;
        
        for (const obj of graph.objects(act, U.asObject)) {
            const ov = termToValue(obj);
            if (!ov) continue;
            
            const key =
            ov.type === "iri" ? ov.value :
            ov.type === "bnode" ? ov.value :
            null;
            
            if (!key) continue;
            
            // Only include objects that look like actual datasets *in this page*
            // (prevents emitting catalog-listed datasets that have no description in this fragment)
            const looksLikeDataset =
            graph.hasType(key, U.dcatDataset) ||
            graph.objects(key, U.dctTitle).length > 0 ||
            graph.objects(key, U.dcatDistribution).length > 0;
            
            if (looksLikeDataset) datasetKeys.add(key);
        }
    }
    
    return Array.from(datasetKeys);
}

export function getDatasetObject(dataset: DcatApDataset): Dataset | null {
    if (!dataset.title) return null
    return {
        id: dataset.id,
        title: dataset.title ,
        description: dataset.description === null ? undefined : dataset.description,
        publisher: dataset.publisher.strings 
            ? dataset.publisher.strings[0] || undefined 
            : dataset.publisher.expanded[0].toString(), //todo:: check
        modified: dataset.modified[0],
        issued: dataset.issued[0],
        keyword: dataset.keyword,
        //   // shapeId?: string; // Shape this dataset conforms to
        feedId: dataset.feed,
        // accessURL: dataset.endpointURL[0],
        distribution: dataset.endpointURL.map(url => { return({accessURL: url})}),
        //   ontologies?: string[]
        //   profile?: Profile;
    };
}

// preferLang: options.preferLang ?? ["en"],
//       dereferenceLinkedResources: options.dereferenceLinkedResources ?? false,
//       maxPages: options.maxPages ?? 1000,
//       maxDescribeDepth: options.maxDescribeDepth ?? 2,
//       fetchOptions: options.fetchOptions ?? {},