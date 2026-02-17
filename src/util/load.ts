/**
 * NOTE: WE COMPLETELY DISREGARD DATASET UPDATES HERE FOR NOW, SINCE WE RUN IT IN FRONT-END
 * BACKEND SYSTEMS MUST ADHERE TO DATASET UPDATES AND DELETIONS ETC ...
 */

import { extractDatasets } from "./DatasetExtractor";
import { DcatApClient } from "./DcatApLoader";
import { LdesDcatApMaterializer } from "./LdesDcatApLoader";
import { extractPipelines } from "./PipelineExtractor";
import { Feed } from "./types";

export async function * loadDcatApMembers(feed: Feed) {
  for await (const dataset of extractDatasets(feed.url, feed.id)) {
    console.log("Dataset:", JSON.stringify(dataset, null, 2));
    yield(dataset)
  }
};

export async function * loadPipelineMembers(feed: Feed) {
  for await (const pipeline of extractPipelines(feed.url, feed.id)) {
    console.log("Pipeline:", JSON.stringify(pipeline, null, 2));
    pipeline.active = true;
    yield(pipeline)
  }
};


export async function * loadFeed(feed: Feed) {

  if (feed.isLdesFeed) {
    const materializer = new LdesDcatApMaterializer({preferLang: ["nl", "en"]});
    materializer.materialize(feed.url)
  } else {
    const loader = new DcatApClient({preferLang: ["nl", "en"]});
    loader.loadAllDatasets(feed.url)
  }
  
}



// // dcat-compact.ts
// import type { Quad, NamedNode, BlankNode, Literal } from "n3";
// import { replicateLDES } from "ldes-client";
// import type { Dataset, Scalar, CompactObject, CompactDatasetJSON } from "./types";

// /**
//  * BIG NOTE: WE COMPLETELY DISREGARD DATASET UPDATES HERE FOR NOW, SINCE WE RUN IT IN FRONT-END
//  * BACKEND SYSTEMS MUST ADHERE TO DATASET UPDATES AND DELETIONS ETC ...
//  */

// // --- Constants & vocab -------------------------------------------------------

// const RDF_TYPE =
//   "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
// const DCAT_DATASET =
//   "http://www.w3.org/ns/dcat#Dataset";

// const DCT_NS = "http://purl.org/dc/terms/";
// const DCT_TITLE = DCT_NS + "title";
// const DCT_DESCRIPTION = DCT_NS + "description";

// const NUMERIC_DATATYPES = new Set<string>([
//   "http://www.w3.org/2001/XMLSchema#integer",
//   "http://www.w3.org/2001/XMLSchema#int",
//   "http://www.w3.org/2001/XMLSchema#long",
//   "http://www.w3.org/2001/XMLSchema#short",
//   "http://www.w3.org/2001/XMLSchema#byte",
//   "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
//   "http://www.w3.org/2001/XMLSchema#positiveInteger",
//   "http://www.w3.org/2001/XMLSchema#unsignedInt",
//   "http://www.w3.org/2001/XMLSchema#unsignedLong",
//   "http://www.w3.org/2001/XMLSchema#unsignedShort",
//   "http://www.w3.org/2001/XMLSchema#unsignedByte",
//   "http://www.w3.org/2001/XMLSchema#decimal",
//   "http://www.w3.org/2001/XMLSchema#double",
//   "http://www.w3.org/2001/XMLSchema#float"
// ]);

// type Term = NamedNode | BlankNode | Literal;

// // --- Small helpers -----------------------------------------------------------

// function compactPredicate(iri: string): string {
//   const hashIdx = iri.lastIndexOf("#");
//   const slashIdx = iri.lastIndexOf("/");
//   const idx = Math.max(hashIdx, slashIdx);

//   if (idx >= 0 && idx < iri.length - 1) {
//     return iri.substring(idx + 1);
//   }
//   return iri;
// }

// function termToScalar(term: Term): Scalar {
//   if (term.termType === "NamedNode") {
//     return term.value;
//   }
//   if (term.termType === "Literal") {
//     const dt = term.datatype?.value || "";

//     // Dates
//     if (
//       dt === "http://www.w3.org/2001/XMLSchema#dateTime" ||
//       dt === "http://www.w3.org/2001/XMLSchema#date"
//     ) {
//       return new Date(term.value);
//     }

//     // Numerics
//     if (NUMERIC_DATATYPES.has(dt)) {
//       const n = Number(term.value);
//       if (!Number.isNaN(n)) return n;
//     }

//     return term.value;
//   }

//   // BlankNode should be handled via expandNode; fallback:
//   return (term as any).value ?? "";
// }

// function addValue(
//   obj: CompactObject,
//   key: string,
//   value: CompactObject | Scalar
// ): void {
//   const existing = obj[key];
//   if (existing === undefined) {
//     obj[key] = value;
//   } else if (Array.isArray(existing)) {
//     (existing as any[]).push(value);
//   } else {
//     obj[key] = [existing as any, value] as any;
//   }
// }

// function expandNode(
//   subjectId: string,
//   quadsBySubject: Map<string, Quad[]>,
//   visited: Set<string>
// ): CompactObject {
//   if (visited.has(subjectId)) return {};
//   visited.add(subjectId);

//   const result: CompactObject = {};
//   const quads = quadsBySubject.get(subjectId) || [];

//   for (const q of quads) {
//     if (q.predicate.termType !== "NamedNode") continue;

//     const pIri = q.predicate.value;
//     let value: CompactObject | Scalar;

//     if (q.object.termType === "BlankNode") {
//       value = expandNode(q.object.value, quadsBySubject, visited);
//     } else {
//       value = termToScalar(q.object as Term);
//     }

//     if (pIri === RDF_TYPE) {
//       addValue(result, "type", value);
//     } else if (pIri === DCT_TITLE) {
//       addValue(result, "title", value);
//     } else if (pIri === DCT_DESCRIPTION) {
//       addValue(result, "description", value);
//     } else {
//       const key = compactPredicate(pIri);
//       addValue(result, key, value);
//     }
//   }

//   return result;
// }

// // --- PUBLIC: compact datasets from quads -------------------------------------

// export function compactDcatDatasetsFromQuads(allQuads: Quad[]): CompactDatasetJSON[] {
//   // 1. Find all dataset IDs
//   const datasetIds = new Set<string>();
//   for (const q of allQuads) {
//     if (
//       q.predicate.termType === "NamedNode" &&
//       q.predicate.value === RDF_TYPE &&
//       q.object.termType === "NamedNode" &&
//       q.object.value === DCAT_DATASET &&
//       q.subject.termType === "NamedNode"
//     ) {
//       datasetIds.add(q.subject.value);
//     }
//   }

//   // 2. Index quads by subject
//   const quadsBySubject = new Map<string, Quad[]>();
//   for (const q of allQuads) {
//     if (q.subject.termType === "NamedNode" || q.subject.termType === "BlankNode") {
//       const key = q.subject.value;
//       const arr = quadsBySubject.get(key);
//       if (arr) {
//         arr.push(q);
//       } else {
//         quadsBySubject.set(key, [q]);
//       }
//     }
//   }

//   // 3. Build compact dataset objects
//   const datasets: CompactDatasetJSON[] = [];

//   for (const dsId of datasetIds) {
//     const compact: CompactDatasetJSON = { id: dsId };
//     const subjectQuads = quadsBySubject.get(dsId) || [];

//     for (const q of subjectQuads) {
//       if (q.predicate.termType !== "NamedNode") continue;

//       const pIri = q.predicate.value;
//       let value: CompactObject | Scalar;

//       // include namednode as well for profile dereferencing
//       if (q.object.termType === "BlankNode" || q.object.termType === "NamedNode") { 
//         value = expandNode(q.object.value, quadsBySubject, new Set<string>());
//       } else {
//         value = termToScalar(q.object as Term);
//       }

//       if (pIri === RDF_TYPE) {
//         addValue(compact, "type", value);
//       } else if (pIri === DCT_TITLE) {
//         addValue(compact, "title", value);
//       } else if (pIri === DCT_DESCRIPTION) {
//         addValue(compact, "description", value);
//       } else {
//         const key = compactPredicate(pIri);
//         addValue(compact, key, value);
//       }
//     }

//     datasets.push(compact);
//   }

//   return datasets;
// }

// async function* getMembers(url: string) {
//   const ldesClient = replicateLDES({ url });
//   const memberReader = ldesClient.stream().getReader();
//   let member = await memberReader.read();
//   while (member) {
//     yield member;
//     member = await memberReader.read();
//     if (member.done) break;
//   }
// }

// async function * fetchDcatFromLDES(url: string) {
//   for await (const member of getMembers(url)) {
//     const value = member.value;
//     if (!value) continue;
//     const quads = value.quads as Quad[];
//     const datasets = compactDcatDatasetsFromQuads(quads)
//     const dataset = datasets[0]
//     if (dataset) {
//         const aligned = alignTypes(dataset)
//         if (aligned) yield aligned
//     }
//   }
//   return
// }

// function alignTypes( dataset: CompactDatasetJSON ): Dataset | undefined {
   
//     const newDataset = dataset as unknown as Dataset;

//     if (!newDataset.id) return undefined;
//     if (!newDataset.title) return undefined;

//     if (!newDataset.accessURL) {
//         if (isUrl(newDataset.id)) {
//             newDataset.accessURL = newDataset.id
//         } else {
//             return undefined;
//         } 
//     }

//     const profile = dataset['conformsTo']
    
//     if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return newDataset
//     const profileType: CompactObject = (profile as CompactObject)['type'] as CompactObject
//     if (!profileType) return newDataset;

//     const profileObject = profile as CompactObject
    
//     const resources: undefined | CompactObject | CompactObject[] 
//         = profileObject.hasResource as undefined | CompactObject | CompactObject[];

//     if (!resources) return newDataset

//     if (Array.isArray(resources)) {
//         for (let res of resources) {
//             const role = res.hasRole
//             const artifact = res.hasArtifact as string | undefined
//             if (role === "http://www.w3.org/ns/dx/prof/role/validation" && artifact) {
//                 newDataset.shapeId = artifact as string;
//             } else if (role === "http://www.w3.org/ns/dx/prof/role/vocabulary" && artifact) {
//                 newDataset.ontologies = Array.isArray(newDataset.ontologies) 
//                     ? newDataset.ontologies.concat([artifact]) : 
//                     [ artifact ]
//             }
//         }
//     }

//     return newDataset;
// }

// export function isUrl(value: string): boolean {
//     try {
//         new URL(value);
//         return true;
//     } catch {
//         return false;
//     }
// }

// (async () => {
//     for await (const dataset of fetchDcatFromLDES(
//         "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/dcat-ap-feed.trig"
//     )) {
//         console.log(JSON.stringify(dataset, null, 2));
//     }
// })();
