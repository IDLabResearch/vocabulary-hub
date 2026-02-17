import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, GitBranch, ArrowRight } from 'lucide-react';
import { Pipeline, Feed, Profile } from '../util/types';

const SPARQLPIPELINEENDPOINT = "ghcr.io/dexagod/ldes-sparql-graphstore-pipeline:latest"
// const DEFAULTQUERY = `CONSTRUCT WHERE { ?s ?p ?o . }`
const DEFAULTQUERY = `PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>

PREFIX sosa:   <http://www.w3.org/ns/sosa/>
PREFIX ssn:    <http://www.w3.org/ns/ssn/>
PREFIX geo:    <http://www.w3.org/2003/01/geo/wgs84_pos#>

PREFIX prov:   <http://www.w3.org/ns/prov#>
PREFIX terms:  <http://purl.org/dc/terms/>
PREFIX time:   <http://www.w3.org/2006/time#>

PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
PREFIX sf:        <http://www.opengis.net/ont/sf#>

PREFIX verkeersmetingen: <https://data.vlaanderen.be/ns/verkeersmetingen#>
PREFIX weg:             <https://data.vlaanderen.be/ns/weg#>
PREFIX netwerk:         <https://data.vlaanderen.be/ns/netwerk#>
PREFIX vsds:            <https://implementatie.data.vlaanderen.be/ns/vsds-verkeersmetingen#>

PREFIX LinkDirectionValue: <https://inspire.ec.europa.eu/codelist/LinkDirectionValue/>
PREFIX MeasureTypes:       <http://def.isotc211.org/iso19103/2015/MeasureTypes#>
PREFIX schema:             <https://schema.org/>

# Alignment: sosa:Observation (+ WGS84 location FOI) -> vsds:Verkeerstelling
# Notes:
# - The nested structures are minted as deterministic blank nodes (BNODE with stable labels).
# - Where your input has no equivalent (sensor type, voertuigType, kenmerktype, etc.),
#   fixed IRIs are used; replace them with your preferred controlled vocabularies.
# - phenomenonTime is turned into a time:TemporalEntity with a default duration PT1M.

CONSTRUCT {
  ?vobs
      rdf:type vsds:Verkeerstelling ;
      <http://def.isotc211.org/iso19156/2011/Observation#OM_Observation.phenomenonTime> ?tempEnt ;
      terms:isVersionOf ?baseObs ;
      prov:generatedAtTime ?genTime ;
      sosa:madeBySensor ?sensor ;
      verkeersmetingen:geobserveerdObject ?meetpunt ;
      vsds:Verkeerstelling.geobserveerdKenmerk ?kenmerk ;
      vsds:Verkeerstelling.tellingresultaat ?count .

  ?tempEnt
      rdf:type time:TemporalEntity ;
      time:hasBeginning ?instant ;
      time:hasXSDDuration "PT1M"^^xsd:duration .

  ?instant
      rdf:type time:Instant ;
      time:inXSDDateTimeStamp ?phenTime .

  ?sensor
      rdf:type sosa:Sensor ;
      terms:type <https://example.org/id/sensorType/unknown> .

  ?meetpunt
      rdf:type verkeersmetingen:Verkeersmeetpunt ;
      <http://def.isotc211.org/iso19156/2011/SamplingPoint#SF_SamplingPoint.shape> ?point ;
      verkeersmetingen:bemonsterdObject ?rijrichting ;
      vsds:Verkeersmeetpunt.verkeersmeetpuntnetwerkreferentie ?puntref .

  ?point
      rdf:type sf:Point ;
      geosparql:asWKT ?wktPoint .

  ?rijrichting
      rdf:type weg:Rijrichting ;
      weg:rijrichting LinkDirectionValue:inDirection ;
      vsds:Rijrichting.netwerkreferentieelement ?wegsegment .

  ?wegsegment
      rdf:type weg:Wegsegment ;
      netwerk:Link.geometriemiddellijn ?line ;
      netwerk:beginknoop ?begknoop ;
      netwerk:eindknoop ?eindknoop .

  ?line
      rdf:type sf:LineString ;
      geosparql:asWKT ?wktLine .

  ?begknoop
      rdf:type weg:Wegknoop ;
      netwerk:Knoop.geometrie ?begPoint .

  ?eindknoop
      rdf:type weg:Wegknoop ;
      netwerk:Knoop.geometrie ?endPoint .

  ?begPoint
      rdf:type sf:Point ;
      geosparql:asWKT ?wktPoint .

  ?endPoint
      rdf:type sf:Point ;
      geosparql:asWKT ?wktPoint .

  ?puntref
      rdf:type netwerk:Puntreferentie ;
      netwerk:Puntreferentie.opPositie ?len ;
      netwerk:toepassingsRichting LinkDirectionValue:bothDirection .

  ?len
      rdf:type MeasureTypes:Length ;
      schema:unitCode "m"^^<https://w3id.org/cdt/ucumunit> ;
      schema:value 0.0e0 .

  ?kenmerk
      rdf:type vsds:Verkeerstellingkenmerk ;
      verkeersmetingen:voertuigType <https://example.org/id/voertuigType/unknown> ;
      vsds:Verkeerstellingkenmerk.kenmerktype <https://data.vlaanderen.be/doc/concept/VkmVerkeersKenmerkType/aantal> .
}
WHERE {
  ?obs rdf:type sosa:Observation ;
       sosa:phenomenonTime ?phenTime ;
       sosa:resultTime ?genTime ;
       sosa:hasSimpleResult ?count ;
       sosa:hasFeatureOfInterest ?loc .

  # pick the FOI that is a location feature with WGS84 lat/long
  ?loc rdf:type ssn:SpatialObject ;
       geo:lat ?lat ;
       geo:long ?long .

  # Target observation IRI:
  # - here we keep the original ?obs IRI, but you can mint a new one if you prefer
  BIND(?obs AS ?vobs)

  # isVersionOf: drop the last path segment
  BIND( IRI(REPLACE(STR(?vobs), "/[^/]*$", "")) AS ?baseObs )

  # Geometry literals (WKT uses "lon lat")
  BIND( STRDT(CONCAT("POINT (", STR(?long), " ", STR(?lat), ")"), geosparql:wktLiteral) AS ?wktPoint )
  BIND( STRDT(CONCAT("LINESTRING (",
                      STR(?long), " ", STR(?lat), ", ",
                      STR(?long), " ", STR(?lat),
                      ")"), geosparql:wktLiteral) AS ?wktLine )

  # Deterministic blank nodes (stable IDs per observation)
  BIND( BNODE(CONCAT("temp-", SHA1(STR(?vobs)))) AS ?tempEnt )
  BIND( BNODE(CONCAT("inst-", SHA1(STR(?vobs)))) AS ?instant )
  BIND( BNODE(CONCAT("sens-", SHA1(STR(?vobs)))) AS ?sensor )
  BIND( BNODE(CONCAT("mp-",   SHA1(STR(?vobs)))) AS ?meetpunt )
  BIND( BNODE(CONCAT("pt-",   SHA1(STR(?vobs)))) AS ?point )
  BIND( BNODE(CONCAT("rr-",   SHA1(STR(?vobs)))) AS ?rijrichting )
  BIND( BNODE(CONCAT("ws-",   SHA1(STR(?vobs)))) AS ?wegsegment )
  BIND( BNODE(CONCAT("ls-",   SHA1(STR(?vobs)))) AS ?line )
  BIND( BNODE(CONCAT("bk-",   SHA1(STR(?vobs)))) AS ?begknoop )
  BIND( BNODE(CONCAT("ek-",   SHA1(STR(?vobs)))) AS ?eindknoop )
  BIND( BNODE(CONCAT("bp-",   SHA1(STR(?vobs)))) AS ?begPoint )
  BIND( BNODE(CONCAT("ep-",   SHA1(STR(?vobs)))) AS ?endPoint )
  BIND( BNODE(CONCAT("pr-",   SHA1(STR(?vobs)))) AS ?puntref )
  BIND( BNODE(CONCAT("len-",  SHA1(STR(?vobs)))) AS ?len )
  BIND( BNODE(CONCAT("ken-",  SHA1(STR(?vobs)))) AS ?kenmerk )
}`

interface PipelineManagerProps {
  feeds: Feed[],
  profiles: Profile[],
  // pipelines: Pipeline[];
  // shapes: ShaclShape[];
  onAddPipeline: (pipeline: Pipeline) => void;
  // onTogglePipeline: (id: string) => void;
  // onRemovePipeline: (id: string) => void;
  onTogglePipelineFeed: (id: string) => void;
}

export function PipelineManager({ 
  // pipelines,
  feeds,
  profiles,
  // shapes,
  onAddPipeline, 
  // onTogglePipeline, 
  // onRemovePipeline,
  onTogglePipelineFeed,
}: PipelineManagerProps) {
  const [pipelineName, setPipelineName] = useState('');
  // const [pipelineSource, setPipelineSource] = useState('');
  // const [pipelineTarget, setPipelineTarget] = useState('');
  const [pipelineFeed, setPipelineFeed] = useState(feeds[0].id);
  const [sourceShape, setSourceShape] = useState('');
  const [targetShape, setTargetShape] = useState('');
  const [sparqlQuery, setSparqlQuery] = useState(DEFAULTQUERY);
  const [showForm, setShowForm] = useState(false);

  const [keyWordInput, setKeyWordInput] = useState("");
  const [keyWords, setKeyWords] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  //   if (pipelineName.trim() && pipelineEndpoint.trim() && sourceShape && targetShape) {
      // onAddPipeline(pipelineName.trim(), pipelineEndpoint.trim(), sourceShape, targetShape);
  //     setPipelineName('');
  //     setPipelineEndpoint('');
  //     setSourceShape('');
  //     setTargetShape('');
      setShowForm(false);
  //   }
    addPipeline()
  };

  function addPipeline() {
    const pipeline: Pipeline = {
      id: window.crypto.randomUUID().slice(0, 5) + pipelineName,
      name: pipelineName,
      keyword: keyWords,
      // endpoint: pipelineSource,
      sourceProfile: sourceShape,
      targetProfile: targetShape,
      active: true,
      feedId: pipelineFeed,
      usesMappingProfile: {
        id: window.crypto.randomUUID().slice(0, 5) + pipelineName + "-profile",
        hasResource: [
          {
            type: "http://www.w3.org/ns/dx/prof/ResourceDescriptor",
            hasRole: "http://www.w3.org/ns/sparql-service-description#SPARQL11Query",
            hasArtifact: sparqlQuery,
          }
        ],
      },
      query: sparqlQuery,
      endpoint: SPARQLPIPELINEENDPOINT
    };

    // reset form
    setPipelineName('');
    setSourceShape('');
    setTargetShape('');
    setKeyWordInput('');
    setKeyWords([]);
    setSparqlQuery(DEFAULTQUERY);

    //submit
    onAddPipeline(pipeline)
  }

  function handleRemoveKeyword(keyword: string) {
    setKeyWords(keyWords.filter(kw => kw !== keyword));
  }
  function submitKeyword(keyword: string) {
    setKeyWords(keyWords.concat([keyword]))
    setKeyWordInput('')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Pipeline Sources</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Pipeline
          </button>
        </div>
      </div>

      {showForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pipelineName" className="block text-gray-700 mb-1.5">
                Pipeline Name
              </label>
              <input
                type="text"
                id="pipelineName"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g., DCAT to Schema.org Alignment"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {/* <div>
              <label htmlFor="pipelineSource" className="block text-gray-700 mb-1.5">
                Source LDES
              </label>
              <input
                type="url"
                id="pipelineSource"
                value={pipelineSource}
                onChange={(e) => setPipelineSource(e.target.value)}
                placeholder="https://api.example.com/align/pipeline"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div> */}
            {/* <div>
              <label htmlFor="pipelineTarget" className="block text-gray-700 mb-1.5">
                Target graphstore
              </label>
              <input
                type="url"
                id="pipelineTarget"
                value={pipelineTarget}
                onChange={(e) => setPipelineTarget(e.target.value)}
                placeholder="https://api.example.com/align/pipeline"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div> */}
            <div>
              <label htmlFor="sourceShape" className="block text-gray-700 mb-1.5">
                Source profile
              </label>
              <select
                id="sourceShape"
                value={sourceShape}
                onChange={(e) => setSourceShape(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select source profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetShape" className="block text-gray-700 mb-1.5">
                Target profile
              </label>
              <select
                id="targetShape"
                value={targetShape}
                onChange={(e) => setTargetShape(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select target profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetShape" className="block text-gray-700 mb-1.5">
                Add to feed
              </label>
              <select
                id="targetShape"
                value={pipelineFeed}
                onChange={(e) => setPipelineFeed(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {feeds.map(feed => (
                  <option key={feed.id} value={feed.id}>{feed.name}</option>
                ))}
              </select>
            </div>
            

            <div className="mt-4">
              <p className="text-gray-700 mb-2">Add keywords:</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add keyword filter..."
                  value={keyWordInput}
                  onChange={(e) => { setKeyWordInput(e.target.value)}}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();         // stops form submit
                      submitKeyword(keyWordInput); // <-- your handler
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {keyWords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {keyWords.map(keyword => (
                    <button
                      key={keyword}
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition-colors"
                    >
                      {keyword}
                      <span className="ml-1">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>


            <div>
              <label htmlFor="sparqlQuery" className="block text-gray-700 mb-1.5">
                SPARQL Construct query
              </label>
              <textarea
                id="sparqlQuery"
                value={sparqlQuery}
                onChange={(e) => setSparqlQuery(e.target.value)}
                placeholder="SPARQL Construct query"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Pipeline
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        <div className="space-y-3">
          {feeds.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No feeds added yet. Click "Add Feed" to get started.
            </p>
          ) : (
            feeds.map((feed) => (
              <div
                key={feed.id}
                className={`p-4 border rounded-lg transition-all ${
                  feed.active
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900">
                      {feed.name}
                    </h3>
                    <div className="flex flex-col gap-1.5 mt-3 text-sm">
                      {/* <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">From:</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex-1">
                          {getShapeName(pipeline.sourceShape)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">To:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 flex-1">
                          {getShapeName(pipeline.targetShape)}
                        </span>
                      </div> */}
                    </div>
                    <p className="text-gray-600 text-sm mt-3 break-all">
                      <a href={feed.url}>{feed.url}</a>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTogglePipelineFeed(feed.id)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title={feed.active ? 'Hide pipeline' : 'Show pipeline'}
                    >
                      {feed.active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    {/* <button
                      onClick={() => onRemovePipeline(feed.id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
                      title="Remove pipeline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button> */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
