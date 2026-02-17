import { useState, useEffect, useRef } from 'react';
import { Shapes, Search, Calendar, Database, GitBranch, Code, X } from 'lucide-react';
import { Dataset, Pipeline, Profile } from '../util/types';

interface ShapeRegistryPageProps {
  datasets: Dataset[];
  profiles: Profile[];
  pipelines: Pipeline[];
  selectedProfileId: string | null;
  onClearSelection: () => void;
}

export function ShapeRegistryPage({ profiles, datasets, pipelines, selectedProfileId, onClearSelection }: ShapeRegistryPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  // const [datasets, setDatasets] = useState<Dataset[]>([]);
  const selectedShapeRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   const mockDatasets = generateMockDatasets(mockFeeds);
  //   setDatasets(mockDatasets);
  // }, []);

  // Scroll to selected shape when selectedProfileId changes
  useEffect(() => {
    if (selectedProfileId && selectedShapeRef.current) {
      selectedShapeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedProfileId]);

  const filteredProfiles: Profile[] = profiles.filter(profile => {
    const matchesSearch = searchTerm === '' ||
      profile.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNamespace = !selectedNamespace || getProfileOntologies(profile).includes(selectedNamespace);
    
    return matchesSearch && matchesNamespace;
  });

  const namespaces = Array.from(new Set(profiles.map(p => getProfileOntologies(p)))).flat().sort();


  // const shapes : ShaclShape[] = []
  // const filteredProfiles : Profile[] = []
  // const namespaces: any[] = []

  // Get usage counts for each shape
  const getShapeUsage = (profileId: string) => {
    const datasetCount = datasets.filter(d => (d.conformsTo as Profile)?.id === profileId).length;
    const pipelineCount = pipelines.filter(p => 
      p.sourceProfile === profileId || p.targetProfile === profileId
    ).length;
    
    return { datasetCount, pipelineCount };
  };

  function getProfileOntologies(profile: Profile) {
    let ontologies: string[] = []
    if (profile.hasResource) {
      for (let resource of profile.hasResource) {
        if (resource.hasRole === "http://www.w3.org/ns/dx/prof/role/vocabulary") {
          ontologies.push(resource.hasArtifact)
        }
      }
    }
    console.log('found ontologies', ontologies)
    return ontologies
  }

  function getProfileShapeUrl(profile:Profile) {
    if (profile.hasResource) {
      for (let resource of profile.hasResource) {
        if (resource.hasRole === "http://www.w3.org/ns/dx/prof/role/validation") {
          return resource.hasArtifact
        }
      }
    }
    return "Shape not found"
  }

  return (
    <div className="space-y-6">
      {/* {selectedProfileId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shapes className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900">
              Viewing selected shape: <strong>{profiles.find(s => s.id === selectedProfileId)?.name}</strong>
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )} */}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Shapes className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Dataset Profile Registry</h2>
            <span className="ml-auto text-gray-600">
              {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'}
            </span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <p className="text-gray-700 mb-2">Filter by namespace:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedNamespace(null)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedNamespace === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {namespaces.map(namespace => (
                <button
                  key={namespace}
                  onClick={() => setSelectedNamespace(namespace)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedNamespace === namespace
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {namespace}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
          {filteredProfiles.length === 0 ? (
            <div className="p-12 text-center">
              <Shapes className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No profiles found matching your criteria.</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredProfiles.map((profile) => {
                const usage = getShapeUsage(profile.id);
                const isSelected = profile.id === selectedProfileId;
                
                return (
                  <article
                    key={profile.id}
                    ref={isSelected ? selectedShapeRef : null}
                    className={`p-5 border rounded-lg transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-gray-900">{profile.title as string}</h3>
                        {getProfileOntologies(profile).map(ont => 
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm border border-purple-200">
                            {ont}
                          </span>
                      )}
                      </div>
                      <p className="text-gray-600">{profile.id}</p>
                    </div>

                    {/* {getProfileOntologies(profile).length && (
                      <div className="mb-3 text-sm">
                        <span className="text-gray-500">Target Class: </span>
                        <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          {getProfileOntologies(profile).join(', ')}
                        </code>
                      </div>
                    )} */}

                    {/* <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Created {shape.created}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>Modified {shape.modified}</span>
                      </div>
                    </div> */}

                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          Profile SHACL Shape -
                        </span>
                        <span className="text-sm text-gray-500">
                          <a href={getProfileShapeUrl(profile)}>
                            {getProfileShapeUrl(profile)}
                          </a>
                        </span>

                          
                      </div>
                      <ResourceFetcherDisplay url={getProfileShapeUrl(profile)}/>
                      
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700 mb-2">Usage:</p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">
                            {usage.datasetCount} {usage.datasetCount === 1 ? 'dataset' : 'datasets'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-green-600" />
                          <span className="text-gray-600">
                            {usage.pipelineCount} {usage.pipelineCount === 1 ? 'pipeline' : 'pipelines'}
                          </span>
                        </div>
                      </div>

                      {usage.datasetCount > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Datasets using this shape:</p>
                          <div className="space-y-1">
                            {datasets
                              .filter(d => (d.conformsTo as Profile)?.id === profile.id)
                              .slice(0, 3)
                              .map(dataset => (
                                <div key={dataset.id} className="text-sm text-gray-700 pl-3">
                                  • {dataset.title}
                                </div>
                              ))}
                            {datasets.filter(d => (d.conformsTo as Profile)?.id === profile.id).length > 3 && (
                              <div className="text-sm text-gray-500 pl-3">
                                ... and {datasets.filter(d => (d.conformsTo as Profile)?.id === profile.id).length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {usage.pipelineCount > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Pipelines using this shape:</p>
                          <div className="space-y-1">
                            {pipelines
                              .filter(p => p.sourceProfile === profile.id || p.targetProfile === profile.id)
                              .map(pipeline => (
                                <div key={pipeline.id} className="text-sm text-gray-700 pl-3">
                                  • {pipeline.name}
                                  <span className="text-gray-500 ml-2">
                                    ({pipeline.sourceProfile === profile.id ? 'source' : 'target'})
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export function ResourceFetcherDisplay ( props: { url?: string, content?: string }) {
  const [resourceString, setResourceString] = useState(props.content || 'Loading resource ...');
  useEffect(() => {
    if (props.url) {
      fetch(props.url).then(res => res.text().then(text => setResourceString(text)))
    }
  }, []);

  return(
    <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
      <div style={{maxHeight: "8em"}}>
        {resourceString}
      </div>
    </pre>
  )
}