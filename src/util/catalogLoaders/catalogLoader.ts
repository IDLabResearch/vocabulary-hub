import { getFeed, fetchRDF } from "../util";
import { DcatApClient } from "../DcatApLoader";
import { Store, DataFactory } from "n3";
import type { DcatCatalog } from "../../types/dcat-types";

/**
 * Progress callback used by catalog loaders.
 * @callback ProgressCb
 * @param {string} stage - Stage name (e.g. 'start', 'fetchingFeed', 'parsingCatalog', 'collectingResources', 'loaded')
 * @param {*} [payload] - Optional payload containing extra information about the stage
 */
type ProgressCb = (stage: string, payload?: any) => void;

/**
 * Load a DCAT catalog summary for a given URL.
 *
 * The function first attempts to read an Atom/Feed description (using `getFeed`) to obtain
 * basic metadata (id/title/isLdes). It then tries to collect the catalog's resource IRIs by
 * iterating datasets with the `DcatApClient`. If that fails it falls back to fetching and
 * parsing the catalog RDF and searching for `dcat:resource` triples.
 *
 * @param {string} url - The catalog URL to load.
 * @param {ProgressCb} [onProgress] - Optional progress callback receiving stage events.
 * @returns {Promise<DcatCatalog>} A best-effort `DcatCatalog` summary containing `id`, `url`, `resources` and an optional `isLdes` flag.
 */
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
