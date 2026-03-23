import { DcatApClient, getDatasetObject } from "../util/DcatApLoader";
import type { DcatCatalog } from "../types/dcat-types";
import type { DcatDataset, Distribution } from "../types/dcat-types";

/**
 * Given a DcatCatalog, iterate its datasets and return an array of DcatDataset
 * objects (mapped from the internal DcatApDataset representation).
 */
export async function extractDatasetsFromCatalog(catalog: DcatCatalog): Promise<DcatDataset[]> {
  const url = catalog.url ?? catalog.id;
  if (!url) return [];

  const client = new DcatApClient({ maxPages: 1000 });
  const out: DcatDataset[] = [];

  for await (const item of client.iterDatasets(url)) {
    const ds = getDatasetObject(item.dataset);
    if (!ds) continue;

    // Map to DcatDataset shape (best-effort)
    const dsAny = ds as any;
    const mapped: any = {
      id: dsAny.id,
      title: dsAny.title,
      description: dsAny.description,
      publisher: typeof dsAny.publisher === 'string' ? dsAny.publisher : (dsAny.publisher?.id ?? dsAny.publisher),
      issued: ds.issued,
      modified: ds.modified,
      keyword: ds.keyword,
      distribution: (ds.distribution || []).map((d: any) => ({ accessURL: d.accessURL, contentType: d.contentType } as Distribution)),
      feedId: ds.feedId,
      raw: item.dataset.raw,
    } as DcatDataset;

    out.push(mapped);
  }

  return out;
}

export default extractDatasetsFromCatalog;
