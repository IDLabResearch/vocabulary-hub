/**
 * DCAT / DCAT-AP related TypeScript interfaces
 *
 * These types capture catalog, dataset, distribution, profile and alignment
 * artifacts as used in the app. Fields are typed loosely where appropriate
 * because DCAT payloads are heterogeneous; please extend as needed.
 */

// Basic identifier type (IRI)
export type Iri = string;

// Distribution (DCAT Distribution / DCAT-AP)
export interface Distribution {
  id?: Iri;
  accessURL?: string | string[]; // accessURL(s)
  downloadURL?: string | string[]; // downloadURL(s)
  title?: string;
  description?: string;
  format?: string | string[]; // e.g. text/turtle
  mediaType?: string | string[]; // MIME type
  license?: Iri | string;
  issued?: string; // xsd:date
  modified?: string; // xsd:date
  byteSize?: number;
  /** raw quads or original source may be attached */
  raw?: any;
}

// DCAT-AP 3.0.0 Dataset entry (not exhaustive but covers required/commonly used fields)
export interface DcatDataset {
  id: Iri; // Dataset IRI (mandatory)
  title?: string | Record<string,string>;
  description?: string | Record<string,string>;
  publisher?: Iri | { id?: Iri; name?: string };
  issued?: string; // xsd:date
  modified?: string; // xsd:date
  version?: string;
  language?: string | string[];
  theme?: Iri[]; // themes / keywords controlled vocabulary
  keyword?: string[]; // free text keywords
  landingPage?: string;
  contactPoint?: {
    fn?: string;
    hasEmail?: string; // mailto:xxx
    [k:string]: any;
  } | string;
  accrualPeriodicity?: string;
  spatial?: string | Iri;
  temporal?: { start?: string; end?: string } | string;
  conformsTo?: Iri | Iri[];
  distribution: Distribution[];
  accessRights?: string;
  license?: Iri | string;
  publisherType?: string;
  // original source metadata (feed id, page url, etc.)
  feedId?: Iri;
  sourceUrl?: string;
  // raw quads or structured RDF representation if available
  raw?: any;
}

// DCAT Catalog description
export interface DcatCatalog {
  id: Iri;
  title?: string | Record<string,string>;
  description?: string | Record<string,string>;
  publisher?: Iri | { id?: Iri; name?: string };
  issued?: string;
  modified?: string;
  language?: string | string[];
  resources?: Iri[]; // dcat:resource list (IRIs of cataloged resources)
  // optionally embed the resolved resource summaries
  resolvedResources?: Array<CatalogedResource>;
  // indicates whether this catalog is an LDES/EventStream
  isLdes?: boolean;
  url?: string; // original catalog URL
  raw?: any;
}

// Profile resource descriptor (prof:Profile + prof:hasResource entries)
export interface ProfileResourceDescriptor {
  hasRole?: Iri | string; // prof:hasRole
  hasArtifact?: Iri | string; // prof:hasArtifact (artifact IRI)
  title?: string;
  format?: string | Iri;
  // additional properties from prof:ResourceDescriptor
  [k:string]: any;
}

export interface ProfileArtifact {
  id: Iri;
  type?: string; // rdf:type (prof:Profile etc.)
  title?: string | Record<string,string>;
  description?: string;
  publisher?: Iri | { id?: Iri; name?: string };
  isProfileOf?: Iri[]; // prof:isProfileOf -> references to standards / specs
  hasResource?: ProfileResourceDescriptor[];
  // distributions referencing datasets that conform to this profile
  distributions?: Distribution[];
  raw?: any;
}

// Quality measurement (simple representation)
export interface QualityMeasurement {
  type?: string; // e.g. dqv:completeness
  value?: number | string;
  unit?: string;
  raw?: any;
}

// Alignment resource descriptor (mapping/alignment artifact)
export interface AlignmentResourceDescriptor {
  title?: string;
  format?: string | Iri;
  conformsTo?: Iri | string;
  hasArtifact?: Iri | string; // resource (e.g., mapping file)
  hasRole?: Iri | string; // e.g., prof:hasRole role:mapping
  [k:string]: any;
}

export interface AlignmentArtifact {
  id: Iri;
  title?: string | Record<string,string>;
  description?: string;
  publisher?: Iri | { id?: Iri; name?: string };
  // which profile(s) this alignment refers to
  isProfileOf?: Iri[];
  sourceProfile?: Iri; // pmap:sourceProfile
  targetProfile?: Iri; // pmap:targetProfile
  quality?: QualityMeasurement[];
  hasResource?: AlignmentResourceDescriptor[];
  raw?: any;
}

// Union types for convenience
export type CatalogedResource = DcatDataset | ProfileArtifact | AlignmentArtifact;

export default {} as const;
