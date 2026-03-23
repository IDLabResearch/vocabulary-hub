import { fetchRDF } from "../util/util";
import { Store, DataFactory } from "n3";
import type { DcatCatalog, AlignmentArtifact, AlignmentResourceDescriptor, QualityMeasurement } from "../types/dcat-types";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const PMAP = "https://w3id.org/pmap#";
const PROF_NS = "http://www.w3.org/ns/dx/prof/";
const DCT = "http://purl.org/dc/terms/";
const DQV = "http://www.w3.org/ns/dqv#";

export async function extractAlignmentsFromCatalog(catalog: DcatCatalog): Promise<AlignmentArtifact[]> {
  const out: AlignmentArtifact[] = [];
  const resources = catalog.resources ?? [];

  for (const r of resources) {
    try {
      const quads = await fetchRDF(r);
      const store = new Store();
      store.addQuads(quads as any);

      // Look for subjects typed as pmap:ProfileAlignment or pmap:Profile or prof:Profile + pmap properties
      const subjects = store.getSubjects(DataFactory.namedNode(RDF_TYPE), DataFactory.namedNode(PMAP + "ProfileAlignment"), null)
        .concat(store.getSubjects(DataFactory.namedNode(RDF_TYPE), DataFactory.namedNode(PROF_NS + "Profile"), null));

      for (const s of subjects) {
        const id = (s as any).value;
        const title = store.getObjects(s, DataFactory.namedNode(DCT + "title"), null)[0]?.value;
        const publisher = store.getObjects(s, DataFactory.namedNode(DCT + "publisher"), null)[0]?.value;

        const source = store.getObjects(s, DataFactory.namedNode(PMAP + "sourceProfile"), null)[0]?.value;
        const target = store.getObjects(s, DataFactory.namedNode(PMAP + "targetProfile"), null)[0]?.value;

        // quality
        const qNodes = store.getObjects(s, DataFactory.namedNode(DQV + "hasQualityMeasurement"), null);
        const quality: QualityMeasurement[] = [];
        for (const qn of qNodes) {
          const meas = store.getObjects(qn, DataFactory.namedNode(DQV + "isMeasurementOf"), null)[0]?.value;
          const val = store.getObjects(qn, DataFactory.namedNode(DQV + "value"), null)[0]?.value;
          if (meas && val) quality.push({ type: meas, value: Number(val) || val });
        }

        // resources
        const resNodes = store.getObjects(s, DataFactory.namedNode(PROF_NS + "hasResource"), null);
        const descriptors: AlignmentResourceDescriptor[] = [];
        for (const node of resNodes) {
          const titleR = store.getObjects(node, DataFactory.namedNode(DCT + "title"), null)[0]?.value;
          const format = store.getObjects(node, DataFactory.namedNode(DCT + "format"), null)[0]?.value;
          const artifact = store.getObjects(node, DataFactory.namedNode(PROF_NS + "hasArtifact"), null)[0]?.value;
          const conformsTo = store.getObjects(node, DataFactory.namedNode(DCT + "conformsTo"), null)[0]?.value;
          const role = store.getObjects(node, DataFactory.namedNode(PROF_NS + "hasRole"), null)[0]?.value;
          descriptors.push({ title: titleR, format, hasArtifact: artifact, conformsTo, hasRole: role });
        }

        out.push({ id, title, publisher, sourceProfile: source, targetProfile: target, quality, hasResource: descriptors, raw: quads });
      }
    } catch (e) {
      // ignore
    }
  }

  return out;
}

export default extractAlignmentsFromCatalog;
