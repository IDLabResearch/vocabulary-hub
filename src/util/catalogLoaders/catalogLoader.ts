import { getFeed, fetchRDF } from "../util/util";
import { DcatApClient } from "../util/DcatApLoader";
import { Store, DataFactory } from "n3";
import type { DcatCatalog } from "../types/dcat-types";

type ProgressCb = (stage: string, payload?: any) => void;

export async function loadCatalog(url: string, onProgress?: ProgressCb): Promise<DcatCatalog> {
  onProgress?.("start", { url });

  // Try to get a feed description first (may contain catalog id/title)
  onProgress?.("fetchingFeed", { url });
  const feed = await getFeed(url);

  const catalog: DcatCatalog = {
    id: feed?.id ?? url,
    title: feed?.name ?? undefined,
    url,
    resources: [],
    isLdes: !!feed?.isLdesFeed,
  };

  onProgress?.("parsingCatalog", { feed: !!feed });

  // Use the robust DcatApClient to iterate datasets/pages and collect resource IRIs
  onProgress?.("collectingResources");
  const client = new DcatApClient({ maxPages: 1000 });
  const resourceSet = new Set<string>();

  try {
    for await (const item of client.iterDatasets(url)) {
      resourceSet.add(String(item.dataset.id));
    }
  } catch (e) {
    // fallback: try parsing the catalog RDF for dcat:resource triples
    try {
      const quads = await fetchRDF(url);
      const store = new Store();
      store.addQuads(quads as any);
      const subjects = store.getSubjects(DataFactory.namedNode("http://www.w3.org/ns/dcat#Catalog"), null, null);
      if (subjects && subjects.length) {
        const catalogNode = subjects[0];
        const resources = store.getObjects(catalogNode, DataFactory.namedNode("http://www.w3.org/ns/dcat#resource"), null);
        for (const r of resources) resourceSet.add((r as any).value);
      }
    } catch (err) {
      // ignore
    }
  }

  catalog.resources = Array.from(resourceSet);

  onProgress?.("loaded", { catalog });
  return catalog;
}

export default loadCatalog;
