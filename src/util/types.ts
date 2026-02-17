// Core type definitions for the Data Management Portal

import type { Quad } from "n3";

// ============================================================================
// Pipeline Types
// ============================================================================

// export interface Pipeline {
//   id: string;
//   name: string;
//   endpoint: string;
//   sourceShape: string;
//   targetShape: string;
// }

// export interface PipelineConfig {
//   id: string;
//   name: string;
//   description: string;
//   type: string;
//   modified: string;
//   tags: string[];
//   pipelineName: string;
//   sourceShape: string;
//   targetShape: string;
//   status: 'active' | 'pending' | 'completed';
//   configUrl: string;
// }

// ============================================================================
// SHACL Shape Types
// ============================================================================

export interface ShaclShape {
  id: string; // URI/IRI of the shape
  name: string; // sh:name
  description: string;
  targetClass?: string; // sh:targetClass
  namespace: string;
  created: string;
  modified: string;
  definition: string; // The actual SHACL definition
}

// ============================================================================
// Feed Types
// ============================================================================

export interface Feed {
  id: string;
  name: string;
  url: string;
  active: boolean;
  isLdesFeed: boolean;
  quads?: Quad[]
  loading?: boolean;
}

// ============================================================================
// Dataset Types
// ============================================================================

// export interface Dataset {
//   id: string;
//   title: string;
//   description: string;
//   publisher: string;
//   modified: string;
//   keywords: string[];
//   shapeId: string; // Shape this dataset conforms to
//   feedName: string;
//   accessURL: string;
//   ontologies?: string[];
// }

// ============================================================================
// DCAT Compaction Types (for RDF processing)
// ============================================================================

export type Scalar = string | number | Date;

export interface CompactObject {
  [key: string]: Scalar | Scalar[] | CompactObject | CompactObject[] | boolean | undefined;
}

export interface CompactDatasetJSON extends CompactObject {
  id: string;
}

// SHACL Shape interface
export interface ShaclShape {
  id: string; // URI/IRI of the shape
  name: string; // sh:name
  description: string;
  targetClass?: string; // sh:targetClass
  namespace: string;
  created: string;
  modified: string;
  definition: string; // The actual SHACL definition
}

// Dataset interface (now using shape IDs)
export interface Dataset extends CompactObject{
  id: string;
  title: string;
  description?: string;
  publisher?: string;
  modified?: string;
  keyword?: string | string[];
  // shapeId?: string; // Shape this dataset conforms to
  feedId?: string;
  // accessURL?: string;
  ontologies?: string[]
  profile?: Profile;
  distribution: DatasetDistribution[];
}

export interface DatasetDistribution extends CompactObject {
  accessURL: string;
  contentType?: string;
  isRDF?: boolean;
}

export interface DatasetItem {
  dataset: Dataset,
  distribution: Distribution,
}

export interface Distribution {
    id: string;
    accessURL: string[];
    downloadURL: string[];
    mediaType: string[];
    format: string[];
    license: string[];
    rights: string[];
}

// Pipeline configuration interface and templates
export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  modified: string;
  tags: string[];
  pipelineName: string;
  sourceProfile: string;
  targetProfile: string;
  configUrl: string;
}

export interface Pipeline extends CompactObject {
  id: string;
  name: string;
  endpoint?: string;
  keyword: string[];
  sourceProfile: string;
  targetProfile: string;
  active: boolean;
  feedId: string;
  usesMappingProfile: Profile;
  query?: string;
}

export interface Profile extends CompactObject  {
    id: string,
    type?: string,
    title?: string,
    isProfileOf?: string[]
    hasResource: Resource[]
}

export interface Resource extends CompactObject  {
    type: string,
    hasRole: string,
    hasArtifact: string
}