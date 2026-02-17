import { Quad } from "n3"

const DIRECT_PIPELINE_IMAGE = "ghcr.io/dexagod/ldes-to-graphstore-pipeline:latest"
const DUMP_PIPELINE_IMAGE = "ghcr.io/dexagod/dump-sparql-graphstore-pipeline:latest"
const OXIGRAPH_STORE_URL = "http://localhost:7878/store?default"

export type DCAT_AP_FEED_INFO = {
  id: string
  title: string
  description?: string
  accessPoint: string
  format?: string
  shape?: {
    name?: string
    shapeQuads?: Quad[] // keep generic
  }
}

export type PIPELINE_FEED_INFO = {
  id: string
  title: string
  endpointDescription?: string
  endpointURL: string
  sourceShape?: {
    name?: string
    shapeQuads?: Quad[]
  }
  targetShape?: {
    name?: string
    shapeQuads?: Quad[]
  }
}

export type PipelineEntry = {
    name: string
    pipelineImage: string
    source: string
    graphStore: string
    query?: string
}

export type VIA_PIPELINE_INFO = {
  pipelineFeed: PIPELINE_FEED_INFO, 
  sourceFeed: DCAT_AP_FEED_INFO, 
  fromShape: string, 
  pipelineTitle: string
}

export const handlePipelineExport = (direct: {title: string, accessPoint: string}[], via: {
  dataset: {
    title: string,
    accessPoint: string,
  },
  pipeline: {
    title: string,
    endpointURL: string,
    query?: string
  },
}[], options: {targetNamedGraph?: string, graphstoreUrl?: string}) => {

  if (!options.graphstoreUrl) throw new Error('Incorrect target graphstore URL provided.')
  let targetNamedGraph = options.targetNamedGraph || "default"
  targetNamedGraph.trim().startsWith('?') ? targetNamedGraph : "?" + targetNamedGraph.trim();

  let graphstoreUrl = options.graphstoreUrl.endsWith('/') ? options.graphstoreUrl :  options.graphstoreUrl + "/"

  // following the example http://localhost:7878/store?default
  graphstoreUrl = graphstoreUrl + "store" + "?" + targetNamedGraph
    
  const entries: PipelineEntry[] = [];

  for (const datasetEntry of direct) {
    entries.push({  
    name: normalizeString(`direct_${datasetEntry.title}`),
    pipelineImage: DIRECT_PIPELINE_IMAGE,
    source: datasetEntry.accessPoint,
    graphStore: graphstoreUrl,
    })
  } 

  // TODO:: quick and dirty fix for managing when to use LDES and when to use DUMP pipeline. Should get this from the profile but not enough time
  for (const pipelineEntry of via) {
    entries.push({  
    name: normalizeString(`conversion_from_${pipelineEntry.dataset.title}_via_${pipelineEntry.pipeline.title}`),
    pipelineImage: ( pipelineEntry.dataset.accessPoint.startsWith('https://pod.rubendedecker.be/') ? DUMP_PIPELINE_IMAGE : pipelineEntry.pipeline.endpointURL), 
    source: pipelineEntry.dataset.accessPoint,
    graphStore: graphstoreUrl,
    query: pipelineEntry.pipeline.query
    })
  }

  const config = generateDockerComposeConfig(entries)
  const filename = "docker-compose.yml"

  // Create a Blob with the YAML text
  const blob = new Blob([config], { type: "text/yaml" });

  // Create a temporary <a> element to trigger the download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}


  const generateDockerComposeConfig = (entries: PipelineEntry[]): string => {
    console.log('ENTRIES', entries)
    let config = `
version: "3.9"
services:
`
  
    for (const entry of entries) {
      config += 
`
  # pipeline
  client_${entry.name}:
    image: ${entry.pipelineImage}
    environment:
      DEBUG: "*"
      URL: "${entry.source}"
      STORE: "${entry.graphStore}"`
      // ${entry.query ? `- Query=${toYamlDoubleQuoted(entry.query.trim())}` : ``}

if (entry.query) {
  config += "\n" + toYamlBlockScalar("Query", entry.query.trim(), 6, "-") + "\n";
}
    }
    console.log('Docker compose config\n', config)
    return config;
  }



const normalizeString = (s: string) => {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^[^a-z]+/, 'a')
}

function toYamlDoubleQuoted(value: string): string {
  return (
    '"' +
    value
      .replace(/\\/g, '\\\\')   // backslash
      .replace(/"/g, '\\"')     // double quote
      .replace(/\r\n/g, '\n')   // normalize CRLF
      .replace(/\r/g, '\n')     // normalize CR
      .replace(/\n/g, '\\n')    // newline -> \n
      .replace(/\t/g, '\\t')    // optional: tabs
    + '"'
  );
}

function toYamlBlockScalar(key: string, value: any, indent = 6, chomp = "-") {
  // indent = spaces before "Query:" line (i.e., where the key starts)
  // chomp "-" strips final newline, "" keeps, "+" keeps extra
  const ind = " ".repeat(indent);
  const contentInd = " ".repeat(indent + 2);

  // normalize line endings
  const normalized = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // YAML block scalars don't like literal tab indentation in content; optional:
  // replace leading tabs with 2 spaces (or whatever you prefer)
  const lines = normalized.split("\n").map(l => l.replace(/^\t+/g, m => "  ".repeat(m.length)));

  return `${ind}${key}: |${chomp}\n` + lines.map(l => `${contentInd}${l}`).join("\n");
}
