import { Store, type BlankNode, type NamedNode, type Quad, type Term } from "n3";
import { Pipeline, Dataset, CompactObject, Profile } from "./types";
import { extractObject, getMembers, isUrl } from "./util";

// IRIs
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCAT_DATASET = "http://www.w3.org/ns/dcat#Dataset";

export interface CompactDatasetJSON extends CompactObject {
  id: string;
}

export async function * extractDatasets(feedURL: string, feedId: string) {
  for await (const member of getMembers(feedURL)) {
    const value = member.value;
    if (!value) continue;
    const quads = value.quads as Quad[];
    if (!quads || !Array.isArray(quads) || quads.length < 1) {
        console.error('Could not find member quads for', member.value?.id)
        continue
    }
    const store = new Store(quads)

    const objectRoots = quads.filter(q => q.predicate.value === RDF_TYPE && q.object.value === DCAT_DATASET)
    if (!objectRoots || !Array.isArray(objectRoots) || objectRoots.length !== 1) {
        console.error('Could not find dataset root for member', member.value?.id)
        continue
    }
    const root = objectRoots.map(q => q.subject)[0]
    const datasetObject = extractObject(root, store, true) as Dataset
    if (datasetObject.distribution && !Array.isArray(datasetObject.distribution)) { 
      datasetObject.distribution = [ datasetObject.distribution ]
    }
    yield (alignDataset(datasetObject, feedId))
  }
}

function alignDataset(dataset: CompactDatasetJSON, feedId: string): Dataset  {
  console.log('ALIGNING DATASET', dataset.id, feedId)
  dataset.feedId = feedId;
  //@ts-ignore
  if (!dataset.distribution?.length && isUrl(dataset.id)) {
    dataset.distribution = [{ accessURL: dataset.id }]
  } 
  const profile = dataset['conformsTo']
  
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return dataset as Dataset
  const profileType: CompactObject = (profile as CompactObject)['type'] as CompactObject
  if (!profileType) return dataset as Dataset;

  const profileObject = profile as CompactObject
  
  const resources: undefined | CompactObject | CompactObject[] 
    = profileObject.hasResource as undefined | CompactObject | CompactObject[];

  if (!resources) return dataset as Dataset

  if (Array.isArray(resources)) {
    for (let res of resources) {
      const role = res.hasRole
      const artifact = res.hasArtifact as string | undefined
      if (role === "http://www.w3.org/ns/dx/prof/role/validation" && artifact) {
        dataset.shapeId = artifact as string;
      } else if (role === "http://www.w3.org/ns/dx/prof/role/vocabulary" && artifact) {
        dataset.ontologies = Array.isArray(dataset.ontologies) 
          ? dataset.ontologies.concat([artifact]) as string[] 
          : [ artifact ]
      }
    }
  }

  if ((dataset.distribution as CompactObject | undefined)?.accessURL) {
    dataset.distribution = [ {
      accessURL: (dataset.distribution as CompactObject | undefined)?.accessURL,
      contentType: (dataset.distribution as CompactObject | undefined)?.contentType,
    }]
  }

  if ((dataset.conformsTo as CompactObject | undefined)?.type ===  "http://www.w3.org/ns/dx/prof/Profile") {
    dataset.profile = dataset.conformsTo as Profile
  }

  return dataset as Dataset;
}

// (async () => {
//   for await (const dataset of extractDatasets("https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/dcat-ap-feed")) {
//     console.log(JSON.stringify(dataset, null, 2));
//   }
//   return  
// })();


