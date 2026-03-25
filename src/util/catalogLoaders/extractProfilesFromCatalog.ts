import { fetchRDF } from "../util";
import { Store, DataFactory } from "n3";
import type { DcatCatalog, ProfileArtifact, ProfileResourceDescriptor } from "../../types/dcat-types";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const PROF_NS = "http://www.w3.org/ns/dx/prof/";
const DCT = "http://purl.org/dc/terms/";

/**
 * Extract profile artifacts from resources listed in a `DcatCatalog`.
 *
 * For each resource IRI the function fetches RDF and looks for nodes typed
 * `prof:Profile`. It collects id, title, publisher and `prof:hasResource`
 * descriptors and returns them as `ProfileArtifact` objects.
 *
 * Errors while processing individual resources are ignored so other resources
 * continue to be processed.
 *
 * @param {DcatCatalog} catalog - Catalog whose `resources` should be inspected.
 * @returns {Promise<ProfileArtifact[]>} Promise resolving to an array of profile artifacts.
 */
export async function extractProfilesFromCatalog(catalog: DcatCatalog): Promise<ProfileArtifact[]> {
  const out: ProfileArtifact[] = [];
  const resources = catalog.resources ?? [];

  for (const r of resources) {
    try {
      const quads = await fetchRDF(r);
      const store = new Store();
      store.addQuads(quads as any);

      // find subjects typed as prof:Profile
      const subjects = store.getSubjects(DataFactory.namedNode(RDF_TYPE), DataFactory.namedNode(PROF_NS + "Profile"), null);
      for (const s of subjects) {
        const id = (s as any).value;
        const title = store.getObjects(s, DataFactory.namedNode(DCT + "title"), null)[0]?.value;
        const publisher = store.getObjects(s, DataFactory.namedNode(DCT + "publisher"), null)[0]?.value;

        const resourcesNodes = store.getObjects(s, DataFactory.namedNode(PROF_NS + "hasResource"), null);
        const descriptors: ProfileResourceDescriptor[] = [];
        for (const node of resourcesNodes) {
          const role = store.getObjects(node, DataFactory.namedNode(PROF_NS + "hasRole"), null)[0]?.value;
          const artifact = store.getObjects(node, DataFactory.namedNode(PROF_NS + "hasArtifact"), null)[0]?.value;
          const titleR = store.getObjects(node, DataFactory.namedNode(DCT + "title"), null)[0]?.value;
          descriptors.push({ hasRole: role, hasArtifact: artifact, title: titleR });
        }

        out.push({ id, title, publisher, hasResource: descriptors, raw: quads });
      }
    } catch (e) {
      // ignore per-resource errors
    }
  }

  return out;
}

export default extractProfilesFromCatalog;
