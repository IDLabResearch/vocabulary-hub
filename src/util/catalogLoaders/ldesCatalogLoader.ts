import { LdesDcatApMaterializer } from "../util/LdesDcatApLoader";
import type { DcatCatalog } from "../types/dcat-types";

type ProgressCb = (stage: string, payload?: any) => void;

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
