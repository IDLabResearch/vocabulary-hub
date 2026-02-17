import { useState, useEffect } from 'react';
import { Download, Package } from 'lucide-react';
import { Profile, Pipeline, Dataset, Feed } from '../util/types';
import { Textarea } from './ui/textarea';
import * as N3 from "n3"
import { createUpdateString, postResourceAndGetLocation, updateFeed } from '../util/FeedUpdater';

// import { createRequire } from "node:module";
// const require = createRequire(import.meta.url);

//@ts-ignore
// const YarrrmlToRml = require("@rmlio/yarrrml-parser/lib/rml-generator");

const API_BASE = "http://localhost:3000";
const ENDPOINT = `${API_BASE}/map?serialization=nquads`; // change serialization if you want

const template_shape_url = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/shapes/sosa-ssn-shape"

const template_mapping = 
`prefixes:
  sosa: "http://www.w3.org/ns/sosa/"
  ssn:  "http://www.w3.org/ns/ssn/"
  geo:  "http://www.w3.org/2003/01/geo/wgs84_pos#"
  xsd:  "http://www.w3.org/2001/XMLSchema#"
  ex:   "http://example.com/"

mappings:
  travelTimeObservation:
    sources:
      - [ "data.json~jsonpath", "$[*]" ]
    s: "ex:observation/$(predefinedItineraryReference)/$(calculationTime.value)/$(predictionTime.value)"
    po:
      - [ a, "sosa:Observation" ]

      # feature of interest: the itinerary
      - [ "sosa:hasFeatureOfInterest", "ex:itinerary/$(predefinedItineraryReference)~iri" ]

      # also link a location feature (point)
      - [ "sosa:hasFeatureOfInterest", "ex:location/$(latitude)/$(longitude)~iri" ]

      # forecast pattern
      - p: "sosa:phenomenonTime"
        o:
          value: "$(predictionTime.value)"
          datatype: "xsd:dateTime"

      - p: "sosa:resultTime"
        o:
          value: "$(calculationTime.value)"
          datatype: "xsd:dateTime"

      # simple result directly on the observation
      - p: "sosa:hasSimpleResult"
        o:
          value: "$(predictedTravelTime)"
          datatype: "xsd:integer"

  locationFeature:
    sources:
      - [ "data.json~jsonpath", "$[*]" ]
    s: "ex:location/$(latitude)/$(longitude)"
    po:
      - [ a, "sosa:FeatureOfInterest" ]
      - [ a, "ssn:SpatialObject" ]
      - p: "geo:lat"
        o:
          value: "$(latitude)"
          datatype: "xsd:decimal"
      - p: "geo:long"
        o:
          value: "$(longitude)"
          datatype: "xsd:decimal"
`

interface MapDatasetsProps {
  selectedDatasets: Dataset[];
  pipelines: Pipeline[];
  feeds: Feed[];
  profiles: Profile[];
  onTargetChange?: (targetShape: string | null) => void;
  onNavigateToProfile: (shapeId: string) => void;
  onFeedUpdate: (feedUrl: string) => void;
}

export function MapDatasets({ selectedDatasets, feeds, pipelines, profiles, onTargetChange, onNavigateToProfile, onFeedUpdate }: MapDatasetsProps) {
  const defaultTarget = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/data/"
  const defaultFeed = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/dcat-ap-feed"


  for (const d of selectedDatasets) {
    console.log(d)
    if (!d.distribution[0].accessURL) {
      console.error(`Could not find access URL for ${d.id}`)
      return;
    }
  }

  // const [sourceUrls, setSourceUrls] = useState<string[]>(selectedDatasets.map(e => e.accessURL as string))
  const [targetUrl, setTargetUrl] = useState<string> (defaultTarget)
  const [mapping, setMapping] = useState<string> (template_mapping)

  const [profile, setProfile] = useState<string | undefined>(undefined)
  // const [title, setTitle] = useState<string> ("")
  // const [description, setDescription] = useState<string> ("")
  const [keyWordInput, setKeyWordInput] = useState("");
  const [keyWords, setKeyWords] = useState<string[]>([])
  const [ontologyInput, setOntologyInput] = useState("");
  const [ontologies, setOntologies] = useState<string[]>([])
  const [shape, setShape] = useState<string>(template_shape_url)

  const [feed, setFeed] = useState<string>(defaultFeed)

  const reset = () => {
    // setSourceUrls([])
    setTargetUrl(defaultTarget)
    setMapping("")
  }

  function handleRemoveKeyword(keyword: string) {
    setKeyWords(keyWords.filter(kw => kw !== keyword));
  }
  function submitKeyword(keyword: string) {
    setKeyWords(keyWords.concat([keyword]))
    setKeyWordInput('')
  }


  function handleRemoveOntology(ontology: string) {
    setOntologies(ontologies.filter(ont => ont !== ontology));
  }
  function submitOntology(ontology: string) {
    setOntologies(ontologies.concat([ontology]))
    setOntologyInput('')
  }

  const handleMapping = async () => {
    // const sourceUrls = selectedDatasets.map(e => e.accessURL as string)
    console.log('Handling mapping')
    console.log("targetUrl", targetUrl)
    console.log("mapping", mapping)
    // console.log('sourceUrls', sourceUrls)
    console.log('selectedDatasets', selectedDatasets)

    if (!targetUrl || !mapping) return;
    

    const YARRRML_MAPPING = mapping;

    // Replace these URLs / filenames:
    let RESOURCES: {resourceUrl: string, fileName: string}[] = []
    
    // Here, we currently make the assumption we can map all provided resources to "data.json", so we can uniformly define a yarrrml mapping over them.
    // This is of course an enormous generalization, and should be changed to fit the desired functionality.
    for (const dataset of selectedDatasets) {
      const sourceUrl = dataset.distribution[0].accessURL as string;
      const datasetTitle = dataset.title
      const datasetDescription = dataset.description || ""

      RESOURCES = [{
        resourceUrl: sourceUrl, // <-- replace
        fileName: "data.json" // optional; defaults to data.json on server
      }]

      const body = {
        yarrml: YARRRML_MAPPING,
        resources: RESOURCES
      };

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();

        if (!res.ok) {
          // Try to pretty print JSON errors if present
          if (contentType.includes("application/json")) {
            try {
              const json = JSON.parse(text);
              console.error(`Request failed for resource ${sourceUrl}: ${res.status} ${res.statusText}`);
              console.error(JSON.stringify(json, null, 2));
            } catch {
              // fall through
            }
          }
          console.error(`Request failed for resource ${sourceUrl}: ${res.status} ${res.statusText}`);
          console.error(text);
        }

        console.log("Success. Response content-type:", contentType);
        console.log(`---- Mapped resource for ${sourceUrl} ----`);
        console.log(text);

        // Post resource and get the resulting location
        const location = await postResourceAndGetLocation(targetUrl, text, contentType)

        // Update the feed based on the returned location
        const updateString = await createUpdateString(location, sourceUrl, datasetTitle, datasetDescription, keyWords, ontologies, [shape], feed, (profile || null))
        
        await updateFeed(feed, null, updateString)
        console.log(`Updated DCAT-AP feed at ${feed} with a new entry for the mapped resource at ${location}.`)

      } catch (err) {
        console.error("Unexpected error:", err);
      };
    }

    onFeedUpdate(feed)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-5 h-5 text-blue-600" />
        <h2 className="text-gray-900">Dataset RML Mapping</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">Selected Datasets</span>
          </div>
          <p className="text-2xl text-gray-900">
            {selectedDatasets.length}
          </p>
        </div>
        <div>
          <label className="block text-gray-700 mb-2">
            YARRRML mapping 
          </label>
          <label className="block text-gray-400 mb-2">
            Resources are forwarded as 'data.json' to mapper.
          </label>
          <Textarea
            value={mapping || ""}
            rows={10}
            placeholder='yarrml mapping'
            onChange={(e) => setMapping(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          /> 
        </div>
        <div>
          <label className="block text-gray-700 mb-2">
            Mapping service 
          </label>
          <label className="block text-gray-400 mb-2">
            Requires a service to take provided resources and mapping, and returns mapped resources
          </label>
          <input
            value={ENDPOINT || ""}
            placeholder='mapping service'
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          /> 
        </div>
        <div>
          <label className="block text-gray-700 mb-2">
            Mapping target 
          </label>
          <label className="block text-gray-400 mb-2">
            Location where the mapped resources are posted 
          </label>
          <input
            value={targetUrl || ""}
            placeholder='yarrml mapping'
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          /> 
        </div>

        {/* Feed entry */}

        <div>
          <label htmlFor="targetShape" className="block text-gray-700 mb-1.5">
            Target feed
          </label>
          <label className="block text-gray-400 mb-2">
            The posted resources are added to this feed.
          </label>
          <select
            id="targetShape"
            value={feed}
            onChange={(e) => setFeed(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {feeds.map(feed => (
              <option key={feed.id} value={feed.id}>{feed.name}</option>
            ))}
          </select>
        </div>
        
        {/* Profile entry */}

        <div>
          <label htmlFor="targetShape" className="block text-gray-700 mb-1.5">
            Target profile
          </label>
          <label className="block text-gray-400 mb-2">
            The target resources are added to the feed as complying with this profile
          </label>
          <select
            id="targetShape"
            value={profile}
            onChange={(e) => setProfile(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option key={"null"} value={""}>{"Create new profile"}</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>{profile.title}</option>
            ))}
          </select>
        </div>
        
        {/* Create new profile */}

        {!profile && 
          <div> 
            {/* <div>
              <label htmlFor="pipelineName" className="block text-gray-700 mb-1.5">
                Title
              </label>
              <input
                type="text"
                id="profiletitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Profile title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <br />
            
            <div>
              <label htmlFor="pipelineName" className="block text-gray-700 mb-1.5">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Profile description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div> */}

            {/* <div className="mt-4">
              <p className="text-gray-700 mb-2">Add keywords:</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add profile keywords"
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
            </div> */}

            <div className="mt-4">
              <p className="text-gray-700 mb-2">Profile ontologies:</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add used ontologies"
                  value={ontologyInput}
                  onChange={(e) => { setOntologyInput(e.target.value)}}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();         // stops form submit
                      submitOntology(ontologyInput); // <-- your handler
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {ontologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {ontologies.map(ontology => (
                    <button
                      key={ontology}
                      onClick={() => handleRemoveOntology(ontology)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition-colors"
                    >
                      {ontology}
                      <span className="ml-1">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <br />

            <div>
              <label htmlFor="shaclShape" className="block text-gray-700 mb-1.5">
                Profile SHACL shape
              </label>
              <input
                id="shaclShape"
                value={shape}
                onChange={(e) => setShape(e.target.value)}
                placeholder="Add shacl shape"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        }
    
        <button
            onClick={handleMapping}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Map and publish {selectedDatasets.length} dataset{selectedDatasets.length !== 1 ? 's' : ''}
          </button>
      </div>
    </div>
  );
}

const indent = (text: string, spaces: number) =>
  text
    .split('\n')
    .map(line => ' '.repeat(spaces) + line)
    .join('\n')