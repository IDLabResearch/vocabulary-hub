import type { Pipeline, ShaclShape, Feed, Dataset, PipelineConfig } from './types';

// Re-export types for convenience
export type { ShaclShape, Feed, Dataset, PipelineConfig };

// Mock SHACL Shapes
export const mockShapes: ShaclShape[] = [
  {
    id: 'http://example.org/shapes#DCATDatasetShape',
    name: 'DCAT Dataset Shape',
    description: 'Shape for datasets conforming to DCAT-AP specification with core metadata properties',
    targetClass: 'http://www.w3.org/ns/dcat#Dataset',
    namespace: 'DCAT',
    created: '2020-02-04',
    modified: '2020-02-04',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .

ex:DCATDatasetShape
    a sh:NodeShape ;
    sh:name "DCAT Dataset Shape" ;
    sh:targetClass dcat:Dataset ;
    sh:property [
        sh:path dct:title ;
        sh:minCount 1 ;
        sh:datatype rdf:langString ;
    ] ;
    sh:property [
        sh:path dct:description ;
        sh:minCount 1 ;
    ] .`
  },
  {
    id: 'http://example.org/shapes#DCATExtendedShape',
    name: 'DCAT Extended Dataset Shape',
    description: 'Extended DCAT shape with additional quality and temporal properties',
    targetClass: 'http://www.w3.org/ns/dcat#Dataset',
    namespace: 'DCAT',
    created: '2024-01-15',
    modified: '2024-01-15',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dqv: <http://www.w3.org/ns/dqv#> .

ex:DCATExtendedShape
    a sh:NodeShape ;
    sh:name "DCAT Extended Dataset Shape" ;
    sh:targetClass dcat:Dataset ;
    sh:property [
        sh:path dct:temporal ;
        sh:maxCount 1 ;
    ] ;
    sh:property [
        sh:path dqv:hasQualityMeasurement ;
    ] .`
  },
  {
    id: 'http://schema.org/shapes#DatasetShape',
    name: 'Schema.org Dataset Shape',
    description: 'Shape for datasets using Schema.org vocabulary',
    targetClass: 'http://schema.org/Dataset',
    namespace: 'Schema.org',
    created: '2021-08-10',
    modified: '2021-08-10',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix schema: <http://schema.org/> .

ex:SchemaDatasetShape
    a sh:NodeShape ;
    sh:name "Schema.org Dataset Shape" ;
    sh:targetClass schema:Dataset ;
    sh:property [
        sh:path schema:name ;
        sh:minCount 1 ;
    ] .`
  },
  {
    id: 'http://schema.org/shapes#EnhancedDatasetShape',
    name: 'Schema.org Enhanced Dataset',
    description: 'Enhanced Schema.org dataset shape with expanded metadata',
    targetClass: 'http://schema.org/Dataset',
    namespace: 'Schema.org',
    created: '2023-04-20',
    modified: '2023-04-20',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix schema: <http://schema.org/> .

ex:EnhancedDatasetShape
    a sh:NodeShape ;
    sh:name "Schema.org Enhanced Dataset" ;
    sh:targetClass schema:Dataset ;
    sh:property [
        sh:path schema:spatialCoverage ;
    ] .`
  },
  {
    id: 'http://www.w3.org/ns/sosa/shapes#ObservationShape',
    name: 'SOSA Observation Shape',
    description: 'Shape for sensor observations following SOSA ontology',
    targetClass: 'http://www.w3.org/ns/sosa/Observation',
    namespace: 'SOSA',
    created: '2017-10-19',
    modified: '2017-10-19',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

ex:SOSAObservationShape
    a sh:NodeShape ;
    sh:name "SOSA Observation Shape" ;
    sh:targetClass sosa:Observation ;
    sh:property [
        sh:path sosa:hasResult ;
        sh:minCount 1 ;
    ] .`
  },
  {
    id: 'http://www.w3.org/ns/sosa/shapes#EnhancedObservationShape',
    name: 'SOSA Enhanced Observation',
    description: 'Enhanced SOSA observation with additional sensor capabilities',
    targetClass: 'http://www.w3.org/ns/sosa/Observation',
    namespace: 'SOSA',
    created: '2022-06-30',
    modified: '2022-06-30',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

ex:EnhancedObservationShape
    a sh:NodeShape ;
    sh:name "SOSA Enhanced Observation" ;
    sh:targetClass sosa:Observation ;
    sh:property [
        sh:path sosa:madeBySensor ;
        sh:minCount 1 ;
    ] .`
  },
  {
    id: 'http://qudt.org/shapes#QuantityShape',
    name: 'QUDT Quantity Shape',
    description: 'Shape for quantity values with units',
    targetClass: 'http://qudt.org/schema/qudt/QuantityValue',
    namespace: 'QUDT',
    created: '2020-09-15',
    modified: '2020-09-15',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix qudt: <http://qudt.org/schema/qudt/> .

ex:QuantityShape
    a sh:NodeShape ;
    sh:name "QUDT Quantity Shape" ;
    sh:targetClass qudt:QuantityValue ;
    sh:property [
        sh:path qudt:unit ;
        sh:minCount 1 ;
    ] .`
  },
  {
    id: 'http://xmlns.com/foaf/shapes#PersonShape',
    name: 'FOAF Person Shape',
    description: 'Shape for person information using FOAF vocabulary',
    targetClass: 'http://xmlns.com/foaf/0.1/Person',
    namespace: 'FOAF',
    created: '2014-01-14',
    modified: '2014-01-14',
    definition: `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:FOAFPersonShape
    a sh:NodeShape ;
    sh:name "FOAF Person Shape" ;
    sh:targetClass foaf:Person ;
    sh:property [
        sh:path foaf:name ;
        sh:minCount 1 ;
    ] .`
  }
];

// Pipeline data (now using shape IDs)
export const mockPipelines: Pipeline[] = [
  {
    id: '1',
    name: 'DCAT to Schema.org Enhanced',
    endpoint: 'https://api.example.com/align/dcat-schema',
    sourceShape: 'http://example.org/shapes#DCATDatasetShape',
    targetShape: 'http://schema.org/shapes#EnhancedDatasetShape',
    active: true
  },
  {
    id: '2',
    name: 'DCAT Extended to Schema.org Enhanced',
    endpoint: 'https://api.example.com/align/dcat3-schema',
    sourceShape: 'http://example.org/shapes#DCATExtendedShape',
    targetShape: 'http://schema.org/shapes#EnhancedDatasetShape',
    active: true
  },
  {
    id: '3',
    name: 'SOSA Enhanced to QUDT',
    endpoint: 'https://api.example.com/align/sosa-qudt',
    sourceShape: 'http://www.w3.org/ns/sosa/shapes#EnhancedObservationShape',
    targetShape: 'http://qudt.org/shapes#QuantityShape',
    active: true
  },
  {
    id: '4',
    name: 'FOAF to Schema.org',
    endpoint: 'https://api.example.com/align/foaf-schema',
    sourceShape: 'http://xmlns.com/foaf/shapes#PersonShape',
    targetShape: 'http://schema.org/shapes#DatasetShape',
    active: true
  }
];

// Feed interface and data
export const mockFeeds: Feed[] = [
  {
    id: '1',
    name: 'European Data Portal',
    url: 'https://data.europa.eu/api/hub/store/dcat-ap.rdf',
    active: true
  },
  {
    id: '2',
    name: 'Open Data Portal',
    url: 'https://opendata.example.com/dcat-ap.xml',
    active: true
  }
];

// Dataset templates for generating mock data
const datasetTemplates = [
  {
    title: 'Public Transport Routes',
    description: 'Real-time and scheduled public transportation routes including bus, metro, and tram lines across the city.',
    keywords: ['transport', 'routes', 'public'],
    shapeId: 'http://example.org/shapes#DCATDatasetShape',
    publisher: 'City Transport Authority'
  },
  {
    title: 'Air Quality Measurements',
    description: 'Hourly air quality measurements from monitoring stations, including PM2.5, PM10, NO2, and O3 levels.',
    keywords: ['environment', 'air quality', 'monitoring'],
    shapeId: 'http://www.w3.org/ns/sosa/shapes#EnhancedObservationShape',
    publisher: 'Environmental Agency'
  },
  {
    title: 'Building Permits Database',
    description: 'Historical and current building permits issued by the municipality, including construction details and timelines.',
    keywords: ['construction', 'permits', 'buildings'],
    shapeId: 'http://xmlns.com/foaf/shapes#PersonShape',
    publisher: 'Municipal Planning Department'
  },
  {
    title: 'Energy Consumption Statistics',
    description: 'Annual energy consumption data by sector, including residential, commercial, and industrial usage patterns.',
    keywords: ['energy', 'consumption', 'statistics'],
    shapeId: 'http://qudt.org/shapes#QuantityShape',
    publisher: 'Energy Ministry'
  },
  {
    title: 'Population Demographics',
    description: 'Demographic data including age distribution, gender, education levels, and employment statistics.',
    keywords: ['demographics', 'population', 'census'],
    shapeId: 'http://xmlns.com/foaf/shapes#PersonShape',
    publisher: 'National Statistics Office'
  },
  {
    title: 'Traffic Incident Reports',
    description: 'Real-time traffic incidents, road closures, and construction updates affecting major transportation routes.',
    keywords: ['traffic', 'incidents', 'roads'],
    shapeId: 'http://example.org/shapes#DCATExtendedShape',
    publisher: 'Traffic Management Center'
  },
  {
    title: 'Healthcare Facilities Registry',
    description: 'Comprehensive listing of healthcare facilities including hospitals, clinics, and emergency services with contact information.',
    keywords: ['healthcare', 'facilities', 'medical'],
    shapeId: 'http://schema.org/shapes#EnhancedDatasetShape',
    publisher: 'Health Department'
  },
  {
    title: 'Weather Observations',
    description: 'Historical weather data including temperature, precipitation, wind speed, and atmospheric pressure measurements.',
    keywords: ['weather', 'climate', 'meteorology'],
    shapeId: 'http://www.w3.org/ns/sosa/shapes#ObservationShape',
    publisher: 'National Weather Service'
  },
  {
    title: 'Educational Institutions',
    description: 'Directory of public and private educational institutions including schools, colleges, and universities.',
    keywords: ['education', 'schools', 'universities'],
    shapeId: 'http://schema.org/shapes#DatasetShape',
    publisher: 'Education Ministry'
  },
  {
    title: 'Water Quality Reports',
    description: 'Water quality testing results from public water supplies, including chemical and biological parameters.',
    keywords: ['water', 'quality', 'testing'],
    shapeId: 'http://www.w3.org/ns/sosa/shapes#EnhancedObservationShape',
    publisher: 'Water Authority'
  },
  {
    title: 'Crime Statistics',
    description: 'Annual crime statistics by category and district, including trends and comparative analysis.',
    keywords: ['crime', 'safety', 'statistics'],
    shapeId: 'http://qudt.org/shapes#QuantityShape',
    publisher: 'Police Department'
  },
  {
    title: 'Parking Availability',
    description: 'Real-time parking availability data from public parking facilities and on-street parking zones.',
    keywords: ['parking', 'availability', 'urban'],
    shapeId: 'http://example.org/shapes#DCATExtendedShape',
    publisher: 'City Parking Services'
  }
];

// Dataset generator function
export const generateMockDatasets = (feeds: Feed[]): Dataset[] => {
  const datasets: Dataset[] = [];

  feeds.forEach((feed, feedIndex) => {
    const datasetsPerFeed = 4 + (feedIndex * 2);
    for (let i = 0; i < datasetsPerFeed; i++) {
      const template = datasetTemplates[i % datasetTemplates.length];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      
      datasets.push({
        id: `${feed.id}-${i}`,
        title: template.title,
        description: template.description,
        publisher: template.publisher,
        modified: date.toISOString().split('T')[0],
        keywords: template.keywords,
        shapeId: template.shapeId,
        feedName: feed.name,
        accessURL: `${feed.url}/dataset/${i}`
      });
    }
  });

  return datasets;
};

// Pipeline configuration templates for generating mock data
const pipelineConfigTemplates = [
  {
    name: 'Metadata Schema Alignment',
    description: 'Maps metadata fields between different catalog schemas, preserving semantic meaning and relationships.',
    type: 'Schema Mapping',
    tags: ['metadata', 'schema', 'mapping'],
    status: 'active' as const
  },
  {
    name: 'Temporal Coverage Normalization',
    description: 'Standardizes temporal coverage information to ISO 8601 format across all datasets.',
    type: 'Temporal',
    tags: ['temporal', 'time', 'normalization'],
    status: 'active' as const
  },
  {
    name: 'Geospatial Coordinate Transform',
    description: 'Converts geospatial coordinates between different coordinate reference systems (CRS) for spatial alignment.',
    type: 'Geospatial',
    tags: ['geospatial', 'coordinates', 'crs'],
    status: 'active' as const
  },
  {
    name: 'Entity Resolution Pipeline',
    description: 'Identifies and links duplicate entities across datasets using fuzzy matching and probabilistic algorithms.',
    type: 'Entity Resolution',
    tags: ['entity', 'deduplication', 'matching'],
    status: 'pending' as const
  },
  {
    name: 'License Harmonization',
    description: 'Standardizes license information to common frameworks like Creative Commons and Open Data Commons.',
    type: 'Licensing',
    tags: ['license', 'legal', 'rights'],
    status: 'active' as const
  },
  {
    name: 'Quality Score Alignment',
    description: 'Calculates and normalizes data quality metrics across catalogs using standardized quality dimensions.',
    type: 'Quality Assessment',
    tags: ['quality', 'metrics', 'assessment'],
    status: 'completed' as const
  },
  {
    name: 'Language Translation Layer',
    description: 'Provides multilingual alignment for metadata descriptions and keywords using translation APIs.',
    type: 'Translation',
    tags: ['i18n', 'translation', 'multilingual'],
    status: 'pending' as const
  },
  {
    name: 'URI Canonicalization',
    description: 'Normalizes and resolves URIs and identifiers to canonical forms for consistent referencing.',
    type: 'URI Processing',
    tags: ['uri', 'identifier', 'canonical'],
    status: 'active' as const
  }
];

// Pipeline configuration generator function
export const generateMockPipelineConfigs = (pipelines: Pipeline[]): PipelineConfig[] => {
  const configs: PipelineConfig[] = [];

  pipelines.forEach((pipeline, pipelineIndex) => {
    const configsPerPipeline = 4 + (pipelineIndex * 2);
    for (let i = 0; i < configsPerPipeline; i++) {
      const template = pipelineConfigTemplates[i % pipelineConfigTemplates.length];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      
      configs.push({
        id: `${pipeline.id}-${i}`,
        name: template.name,
        description: template.description,
        type: template.type,
        modified: date.toISOString().split('T')[0],
        tags: template.tags,
        pipelineName: pipeline.name,
        sourceShape: pipeline.sourceShape,
        targetShape: pipeline.targetShape,
        status: template.status,
        configUrl: `${pipeline.endpoint}/config/${i}`
      });
    }
  });

  return configs;
};

// Helper function to get shape by ID
export const getShapeById = (shapeId: string): ShaclShape | undefined => {
  return mockShapes.find(shape => shape.id === shapeId);
};

// Helper function to get shape name by ID
export const getShapeName = (shapeId: string): string => {
  const shape = getShapeById(shapeId);
  return shape ? shape.name : shapeId;
};