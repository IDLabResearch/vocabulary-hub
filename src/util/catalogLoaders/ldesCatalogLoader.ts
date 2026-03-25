import { LdesDcatApMaterializer } from "../LdesDcatApLoader";
import type { DcatCatalog } from "../../types/dcat-types";

/**
 * Progress callback used by catalog loaders.
 * @callback ProgressCb
 * @param {string} stage - Stage name (e.g. 'start', 'materializing', 'loaded')
 * @param {*} [payload] - Optional payload containing extra information about the stage
 */
type ProgressCb = (stage: string, payload?: any) => void;

/**
 * Load an LDES-style catalog by materializing its pages using the
 * `LdesDcatApMaterializer`.
 *
 * The materializer produces a result containing `items` with dataset metadata
 * and `stats`. This function maps the materialized items to a `DcatCatalog`
 * where `resources` are the dataset IRIs and `isLdes` is set to true.
 *
 * @param {string} url - URL of the LDES catalog to materialize.
 * @param {ProgressCb} [onProgress] - Optional progress callback.
 * @returns {Promise<DcatCatalog>} Promise resolving to a `DcatCatalog` representing the materialized stream.
 */
export async function loadLdesCatalog(url: string, onProgress?: ProgressCb): Promise<DcatCatalog> {
  onProgress?.("start", { url });
  const mat = new LdesDcatApMaterializer();
  onProgress?.("materializing");
  const result = await mat.materialize(url);

  const catalog: DcatCatalog = {
    id: url,
    url,
    resources: result.items.map((i) => String(i.dataset.id)),
    isLdes: true,
  };

  onProgress?.("loaded", { catalog, stats: result.stats });
  return catalog;
}

export default loadLdesCatalog;
