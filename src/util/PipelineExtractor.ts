import { Store, type BlankNode, type NamedNode, type Quad, type Term } from "n3";
import { Pipeline, Dataset, CompactObject, Profile } from "./types";
import { extractObject, getMembers, isUrl } from "./util";

// IRIs
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const SMAP_NS = "https://pod.rubendedecker.be/scholar/ontologies/smap#";
const SMAP_ALIGNMENT_PIPELINE = SMAP_NS + "AlignmentPipeline";

export async function * extractPipelines(feedURL: string, feedId: string) {
    for await (const member of getMembers(feedURL)) {
        const value = member.value;
        if (!value) continue;
        const quads = value.quads as Quad[];
        if (!quads || !Array.isArray(quads) || quads.length < 1) {
            console.error('Could not find member quads for', member.value?.id)
            continue
        }
        const store = new Store(quads)

        const objectRoots = quads.filter(q => q.predicate.value === RDF_TYPE && q.object.value === SMAP_ALIGNMENT_PIPELINE)
        if (!objectRoots || !Array.isArray(objectRoots) || objectRoots.length !== 1) {
            console.error('Could not find pipeline root for member', member.value?.id)
            continue
        }
        const root = objectRoots.map(q => q.subject)[0]
        let pipelineObject = extractObject(root, store, true) as Pipeline
        pipelineObject.id = root.value;
        pipelineObject.feedId = feedId
        yield (await alignPipeline(pipelineObject))
    }
}

async function alignPipeline(pipeline: Pipeline): Promise<Pipeline> {
    if (!pipeline.name && pipeline.title) pipeline.name = pipeline.title.toString() 
    if (pipeline.hasImplementation) pipeline.endpoint = pipeline.hasImplementation as string
    if (pipeline.keyword && !Array.isArray(pipeline.keyword)) pipeline.keyword = [pipeline.keyword]

    const mappingProfile: Profile = pipeline.usesMappingProfile;
    if (!mappingProfile) throw new Error(`Could not find mapping profile of pipeline ${pipeline.id}`)
    const resources = mappingProfile.hasResource
    if (!resources || !Array.isArray(resources) || !resources.length) return pipeline;

    for (let resource of resources) {
        if (resource.hasRole === "http://www.w3.org/ns/sparql-service-description#SPARQL11Query") {
            const query = resource.hasArtifact;
            if (isUrl(query)) {
                // todo: move this to representation time?
                pipeline.query = await (await fetch(query)).text()
            } else {
                pipeline.query = resource.hasArtifact
            }
            pipeline.query = pipeline.query.trimStart().trimEnd().replace(/^"+/,"").replace(/"+$/,"");
        } 
    }
    return pipeline
}

// (async () => {
//   for await (const pipeline of extractPipelines("https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/pipelines-feed")) {
//     console.log("Pipeline:", JSON.stringify(pipeline, null, 2));
//   }
//   return  
// })();
