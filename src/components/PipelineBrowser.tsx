import { useState, useEffect } from 'react';
import { GitBranch, Search, Calendar, Tag, ExternalLink, ArrowRight, Activity, Shapes } from 'lucide-react';
// import { Pipeline } from '../App';
import { PipelineConfig, generateMockPipelineConfigs, getShapeName } from '../util/mock';
import { CompactObject, Feed, Pipeline, Profile } from '../util/types';
import { ResourceFetcherDisplay } from './ShapeRegistryPage';

interface PipelineBrowserProps {
  pipelines: Pipeline[];
  profiles: Profile[];
  feeds: Feed[];
  onNavigateToProfile: (shapeId: string) => void;
}

export function PipelineBrowser({ pipelines, profiles, feeds, onNavigateToProfile }: PipelineBrowserProps) {
  const [configs, setConfigs] = useState<PipelineConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);

  // useEffect(() => {
  //   const mockConfigs = generateMockPipelineConfigs(pipelines);
  //   setConfigs(mockConfigs);
  // }, [pipelines]);

  const filteredPipelines = pipelines.filter(pipeline => {
    console.log(pipeline)
    const matchesSearch = searchTerm === '' || 
      pipeline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pipeline.id.toLowerCase().includes(searchTerm.toLowerCase()) 
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => pipeline.keyword.includes(tag));

    const matchedFeeds = feeds.filter(feed => feed.id === pipeline.feedId && feed.active).length > 0

    return matchesSearch && matchesTags && matchedFeeds;
  });
  // const filteredConfigs = configs.filter(config => {
  //   const matchesSearch = searchTerm === '' || 
  //     config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     config.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     config.type.toLowerCase().includes(searchTerm.toLowerCase());
    
  //   const matchesTags = selectedTags.length === 0 || 
  //     selectedTags.some(tag => config.tags.includes(tag));

  //   const matchedFeeds = selectedPipelines.length === 0 ||
  //     selectedPipelines.includes(config.pipelineName);

  //   return matchesSearch && matchesTags && matchedFeeds;
  // });

  const allTags = Array.from(
    new Set(pipelines.flatMap(c => c.keyword))
  ).sort();

  // const allPipelines = Array.from(
  //   new Set(pipelines.map(p => p.name))
  // ).sort();

  console.log(JSON.stringify(feeds, null, 2))
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-blue-600" />
          <h2 className="text-gray-900">Pipelines</h2>
          <span className="ml-auto text-gray-600">
            {pipelines.length} {filteredPipelines.length === 1 ? 'pipeline' : 'pipelines'}
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pipelines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* {allPipelines.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-700 mb-2">Filter by pipeline:</p>
            <div className="flex flex-wrap gap-2">
              {allPipelines.map(pipeline => (
                <button
                  key={pipeline}
                  onClick={() => {
                    setSelectedPipelines(prev =>
                      prev.includes(pipeline)
                        ? prev.filter(p => p !== pipeline)
                        : [...prev, pipeline]
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedPipelines.includes(pipeline)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pipeline}
                </button>
              ))}
            </div>
          </div>
        )} */}

        {allTags.length > 0 && (
          <div>
            <p className="text-gray-700 mb-2">Filter by tag:</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag)
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
        {filteredPipelines.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {pipelines.length === 0
                ? 'No active pipelines. Add pipeline feeds to see listings.'
                : 'No pipelines found matching your criteria.'}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredPipelines.map((pipeline) => (
              <article
                key={pipeline.id}
                className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-gray-900">
                      {pipeline.name}
                    </h3>
                    {/* <p className="text-sm text-gray-500 mt-1">{pipeline.type}</p> */}
                  </div>
                  {/* <div className={`px-2 py-1 rounded text-sm ${
                    pipeline.status === 'active'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : pipeline.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {config.status}
                  </div> */}
                </div>

                <p className="text-gray-600 mb-3">
                  {feeds.filter(f => f.id === pipeline.feedId).map(f => f.name)[0] || "Unknown feed"}
                </p>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Shape Alignment:</p>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12">From:</span>
                      <button
                        onClick={() => onNavigateToProfile(pipeline.sourceProfile)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 hover:bg-purple-200 transition-colors flex-1"
                        title="View source shape in registry"
                      >
                        <Shapes className="w-3 h-3" />
                        {profiles.filter(p => p.id === pipeline.sourceProfile)[0]?.title}
                        {/* {getShapeName(pipeline.sourceProfile.title)} */}
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12">To:</span>
                      <button
                        onClick={() => onNavigateToProfile(pipeline.targetProfile)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 hover:bg-green-200 transition-colors flex-1"
                        title="View target shape in registry"
                      >
                        <Shapes className="w-3 h-3" />
                        {profiles.filter(p => p.id === pipeline.targetProfile)[0]?.title}
                        {/* {pipeline.targetProfile} */}
                        {/* {getShapeName(config.targetShape)} */}
                      </button>
                    </div>
                  </div>
                </div>

                { pipeline.query 
                  ? 
                    <div>
                      <p className="text-sm text-gray-600 mb-2">SPARQL mapping:</p>
                      <ResourceFetcherDisplay content={pipeline.query}/> 
                    </div>
                  : <div> </div>  
                }

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  {/* <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>{(pipeline.usesMappingProfile as any | undefined)?.title}</span>
                  </div> */}
                  {/* <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Modified {pipe.modified}</span>
                  </div> */}
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <Tag className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="flex flex-wrap gap-2">
                    {pipeline.keyword.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* <div className="mt-3 pt-3 border-t border-gray-100">
                  <a
                    href={pipeline}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Pipeline
                  </a>
                </div> */}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
