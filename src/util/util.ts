import { DataFactory, Quad, Store, Term } from "n3";
import { rdfParser } from "rdf-parse"
import { CompactObject, Feed, Scalar } from "./types";
import { Stream } from "@rdfjs/types";
import { getEnabledCategories } from "node:trace_events";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCAT_DATASET = "http://www.w3.org/ns/dcat#Dataset";
const DCAT_CATALOG = "http://www.w3.org/ns/dcat#Catalog";
const LDES_EVENTSTREAM = "https://w3id.org/ldes#EventStream"

const NUMERIC_DATATYPES = new Set<string>([
  "http://www.w3.org/2001/XMLSchema#integer",
  "http://www.w3.org/2001/XMLSchema#int",
  "http://www.w3.org/2001/XMLSchema#long",
  "http://www.w3.org/2001/XMLSchema#short",
  "http://www.w3.org/2001/XMLSchema#byte",
  "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
  "http://www.w3.org/2001/XMLSchema#positiveInteger",
  "http://www.w3.org/2001/XMLSchema#unsignedInt",
  "http://www.w3.org/2001/XMLSchema#unsignedLong",
  "http://www.w3.org/2001/XMLSchema#unsignedShort",
  "http://www.w3.org/2001/XMLSchema#unsignedByte",
  "http://www.w3.org/2001/XMLSchema#decimal",
  "http://www.w3.org/2001/XMLSchema#double",
  "http://www.w3.org/2001/XMLSchema#float"
]);

export function extractObject(root: Term, store: Store, followNamedNodes: boolean = true, visited = new Set()): CompactObject {
  let object = { id: root.value };
  if (visited.has(root.value)) return object
  visited.add(root.value)
  for (let quad of store.getQuads(root, null, null, null)) {
    const p = compactPredicate(quad.predicate.value)
    switch (quad.object.termType) {
      case "Variable":
      console.error("Encountered a variable in the source data.")
      break;
      case "NamedNode":
      if (followNamedNodes) {
        const extracted = extractObject(quad.object, store, followNamedNodes, visited)
        if (Object.keys(extracted).length === 0) {
          addValue(object, p, quad.object.value)
        } else if (Object.keys(extracted).length === 1 && Object.keys(extracted)[0] === "id") {
          addValue(object, p, quad.object.value)
        } else {    
          extracted.id = quad.object.value
          addValue(object, p, extracted)
        }   
      } else {
        addValue(object, p, quad.object.value)
      }
      break;
      case "BlankNode":
      addValue(object, p, extractObject(quad.object, store, followNamedNodes, visited))
      break;
      case "Literal":
      addValue(object, p, termToScalar(quad.object))
      break;
      default:
      break;
    }
  }
  return object
}


// --- Small helpers -----------------------------------------------------------

function compactPredicate(iri: string): string {
  const hashIdx = iri.lastIndexOf("#");
  const slashIdx = iri.lastIndexOf("/");
  const idx = Math.max(hashIdx, slashIdx);
  
  if (idx >= 0 && idx < iri.length - 1) {
    return iri.substring(idx + 1);
  }
  return iri;
}

function termToScalar(term: Term): Scalar {
  if (term.termType === "NamedNode") {
    return term.value;
  }
  if (term.termType === "Literal") {
    const dt = term.datatype?.value || "";
    
    // Dates
    if (
      dt === "http://www.w3.org/2001/XMLSchema#dateTime" ||
      dt === "http://www.w3.org/2001/XMLSchema#date"
    ) {
      return new Date(term.value);
    }
    
    // Numerics
    if (NUMERIC_DATATYPES.has(dt)) {
      const n = Number(term.value);
      if (!Number.isNaN(n)) return n;
    }
    
    return term.value;
  }
  
  // BlankNode should be handled via expandNode; fallback:
  return (term as any).value ?? "";
}

function addValue(
  obj: CompactObject,
  key: string,
  value: CompactObject | Scalar
): void {
  const existing = obj[key];
  if (existing === undefined) {
    obj[key] = value;
  } else if (Array.isArray(existing)) {
    (existing as any[]).push(value);
  } else {
    obj[key] = [existing as any, value] as any;
  }
}

function guessFormat(contentType: string | null, url: string): string {
  const ct = (contentType || "").toLowerCase();
  
  if (ct.includes("trig")) return "application/trig";
  if (ct.includes("turtle")) return "text/turtle";
  
  if (url.endsWith(".trig")) return "application/trig";
  if (url.endsWith(".ttl")) return "text/turtle";
  
  // Fallback: turtle is a safe default
  return "text/turtle";
}

export async function getPipelineFeed(url: string){
  
  let quads = await fetchRDF(url)
  
  // small filter to fix some issues in parsing GHRC pipelines
  quads = quads.map(q => q.object.value.startsWith(url+'ghrc.io') 
  ? DataFactory.quad(q.subject, q.predicate, DataFactory.namedNode(q.object.value.split(url)[1]), q.graph)
  : q)
  
  const store = new Store();
  store.addQuads(quads);
  
  // TODO:: MAKE THIS FOLLOW RELATIONS OR STH
  const feedIds = store.getSubjects(
    DataFactory.namedNode(RDF_TYPE), 
    DataFactory.namedNode("https://w3id.org/ldes#EventStream"), 
    null
  )
  if (!feedIds || feedIds.length < 1) return;
  
  const feedId = feedIds[0]
  
  const feed: Feed = {
    id: feedId.value,
    name: store.getObjects(
      feedId,
      DataFactory.namedNode('http://purl.org/dc/terms/title'), 
      null)[0]?.value,
      url,
      active: true,
      isLdesFeed: true,
    }
    return feed
  }
  
  export async function getFeed(url: string) {
    
    let quads = await fetchRDF(url)
    const store = new Store();
    store.addQuads(quads);
    
    try {
      // try the catalog approach
      const catalog = store.getQuads(null, RDF_TYPE, DCAT_CATALOG, null)[0]?.subject
      const ldes = store.getQuads(null, RDF_TYPE, LDES_EVENTSTREAM, null)[0]?.subject
      if (!catalog) throw new Error('No dcat:Catalog entity found.')
        const titles = store.getQuads(catalog, "http://purl.org/dc/terms/title", null, null).map(q => q.object);
      
      const languagedTitle = getLanguageString(titles)
      
      const feed: Feed = {
        id: catalog.value,
        name: store.getObjects( catalog, DataFactory.namedNode('http://purl.org/dc/terms/title'),  null)[0]?.value,
        url,
        active: true,
        quads,
        isLdesFeed: !!ldes,
      }
      return feed
      
      
    } catch (e) {
      console.error(e)
    }
    // small filter to fix some issues in parsing GHRC pipelines
    quads = quads.map(q => q.object.value.startsWith(url+'ghrc.io') 
    ? DataFactory.quad(q.subject, q.predicate, DataFactory.namedNode(q.object.value.split(url)[1]), q.graph)
    : q)
    
    // const filtered = quads.filter(e => e.predicate.value === "https://pod.rubendedecker.be/scholar/ontologies/smap#hasImplementation")
    
    
    // TODO:: MAKE THIS FOLLOW RELATIONS OR STH
    const feedIds = store.getSubjects(
      DataFactory.namedNode(RDF_TYPE), 
      DataFactory.namedNode("https://w3id.org/ldes#EventStream"), 
      null
    )
    if (!feedIds || feedIds.length < 1) return;
    
    const feedId = feedIds[0]
    
    const feed: Feed = {
      id: feedId.value,
      name: store.getObjects(
        feedId,
        DataFactory.namedNode('http://purl.org/dc/terms/title'), 
        null)[0]?.value,
        url,
        active: true,
      }
      return feed
    }
    
    
    export async function* getMembers(url: string) {
      
      const quads = await fetchRDF(url);
      
      const store = new Store();
      store.addQuads(quads);
      
      // TODO:: MAKE THIS FOLLOW RELATIONS OR STH
      
      const members = store.getObjects(null, DataFactory.namedNode('https://w3id.org/tree#member'), null)
      let memberObjects = members.map(member => { 
        return ({ graph: member, object: 
          store.getObjects(member, DataFactory.namedNode("https://www.w3.org/ns/activitystreams#object"), null)
        })
      })
      
      let exportedIds: string[] = []
      for (const memberObject of memberObjects) {
        const id = memberObject.object[0];
        exportedIds.push(id.value);
        const returnObject = {
          value: {
            id,
            quads: store.getQuads(null, null, null, memberObject.graph)
          }
        }
        yield (returnObject)
      }
      
      const entries = getDcatEntries(store, exportedIds)
      for (let entry of entries) {
        yield(entry)
      }
    }
    
    export function getDcatEntries(store: Store, exportedIds: string[] ) { 
      const memberIds = store.getSubjects(DataFactory.namedNode(RDF_TYPE), DataFactory.namedNode(DCAT_DATASET), null)
      const entries = []
      for (const memberId of memberIds) {
        if (exportedIds.indexOf(memberId.value) === -1) {
          const quads = extractEntityQuads(store, memberId)
          const returnObject = {value: {id: memberId, quads}}
          entries.push(returnObject)
        }
      }
      return entries
    }
    
    function extractEntityQuads(store: Store, root: Term, subjects: string[] = []) {
      if (subjects.indexOf(root.value) !== -1) return [];
      const quads = store.getQuads(root, null, null, null);
      let newQuads: Quad[] = []
      for (let quad of quads) {
        newQuads = newQuads.concat(extractEntityQuads(store, quad.object, subjects.concat([root.value])))
      }
      return quads.concat(newQuads)
    }
    
    
    export function isUrl(value: string): boolean {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
    
    
    
    
    
    function isNode() {
      return typeof process !== "undefined" && !!process.versions?.node;
    }
    
    async function stringToTextStream(text: string) {
      if (isNode()) {
        const { Readable } = await import("node:stream");
        // Emits strings -> qualifies as a "text stream" for rdf-parse
        return Readable.from([text]);
      }
      
      // Browser: use a stream implementation that works in browsers
      const { Readable } = await import("readable-stream"); // npm i readable-stream
      const rs = new Readable({ read() {} });
      rs.push(text);
      rs.push(null);
      return rs;
    }
    
    export async function fetchRDF(url: string ) {
      const res = await fetch(url, {
        headers: {
          accept: "application/rdf+xml, text/turtle;q=0.9, application/ld+json;q=0.9, */*;q=0.1",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      
      let contentType = (res.headers.get("content-type") ?? "").split(";")[0];
      if (contentType === 'text/xml') contentType = "application/rdf+xml";
      
      const text = await res.text();
      const textStream = await stringToTextStream(text);
      
      
      const quadStream = rdfParser.parse(textStream, {
        // For your DCAT.xml it’s often safest to force RDF/XML:
        contentType: contentType || "application/rdf+xml",
        baseIRI: res.url,
        path: res.url,
      });
      
      return new Promise((resolve, reject) => {
        const quads: Quad[] = [];
        quadStream.on("data", (q) => quads.push(q));
        quadStream.on("error", reject);
        quadStream.on("end", () => resolve(quads));
      }) as Promise<Quad[]>;
    }
    
    export function getLanguageString(terms: Term[]): string {
      // Return the first literal that has a language tag, otherwise the first literal value
      for (const term of terms) {
        if (!term) continue;
        if ((term as any).termType !== "Literal") continue;
        const lang = (term as any).language as string | undefined;
        const value = (term as any).value as string | undefined;
        if (lang && lang !== "") return value ?? "";
      }
      
      // Fallback: first literal value
      const firstLiteral = terms.find((t) => t && (t as any).termType === "Literal");
      return firstLiteral ? ((firstLiteral as any).value ?? "") : "";
    }