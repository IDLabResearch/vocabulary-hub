import { DcatApClient, getDatasetObject } from "../DcatApLoader";
import type { DcatCatalog } from "../../types/dcat-types";
import type { DcatDataset, Distribution } from "../../types/dcat-types";

/**
 * Extract datasets from a DCAT catalog by iterating the catalog's datasets using
 * the DcatApClient and mapping them to the app's `DcatDataset` shape.
 *
 * This is a best-effort mapper: it uses `getDatasetObject` to normalise the
 * provider-specific dataset representation and maps commonly used fields.
 *
 * @param {DcatCatalog} catalog - Catalog to extract datasets from (uses `catalog.url` or `catalog.id`).
 * @returns {Promise<DcatDataset[]>} Promise resolving to an array of mapped datasets.
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
