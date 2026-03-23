import { useEffect, useState } from 'react';
import { Database, GitBranch, Shapes, BookOpen, Network, Workflow } from 'lucide-react';
import { DataPortalPage } from './components/DataPortalPage';
import { AlignmentPipelinesPage } from './components/AlignmentPipelinesPage';
import { ShapeRegistryPage } from './components/ShapeRegistryPage';
import { DocumentationPage } from './components/DocumentationPage';
import { mockShapes, mockPipelines } from './util/mock';
import type { CompactObject, Dataset, Feed, Pipeline, Profile } from './util/types';
import { loadDcatApMembers, loadPipelineMembers } from './util/load';
import { getFeed } from './util/util';
import { useFeedState, useFeedActions, useFeedDispatch } from './stores/FeedStore';
import { RdfPortalPage } from './components/RdfPortalPage';
import { DcatApClient, getDatasetObject } from './util/DcatApLoader';

type Page = 'data-portal' | /*'mapping-pipelines' |*/ 'rdf-portal' | 'alignment-pipelines' | 'shape-registry' | 'documentation';

const dcatApFeedUrl = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/dcat-ap-feed"
const pipelineFeedUrl = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/pipelines-feed"


export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('data-portal');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const state = useFeedState();
  const actions = useFeedActions();
  const dispatch = useFeedDispatch();

  useEffect(() => {
    // Load initial feeds via the centralized store actions
    actions.loadPipelineFeed(pipelineFeedUrl);
    actions.loadDcatFeed(dcatApFeedUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy per-component loaders removed in favor of centralized store actions

  console.log('feeds', state.feeds)
  console.log('datasets', state.datasets)
  console.log('pipelines', state.pipelines)
  console.log('profiles', state.profiles)

  const handleAddPipeline = (pipeline: Pipeline) => {
    dispatch({ type: 'ADD_PIPELINES', pipelines: [pipeline] });
  };

  const handleTogglePipeline = (id: string) => {
    const existing = state.pipelines.find(p => p.id === id);
    if (!existing) return;
    dispatch({ type: 'ADD_PIPELINES', pipelines: [{ ...existing, active: !existing.active }] });
  };

  const handleRemovePipeline = (id: string) => {
    dispatch({ type: 'REMOVE_PIPELINE', id });
  };

  const handleNavigateToShape = (shapeId: string) => {
    setSelectedProfileId(shapeId);
    setCurrentPage('shape-registry');
  };

  const onToggleDatasetFeed = (id : string) => {
    const feed = state.feeds.find(f => f.id === id || f.url === id);
    if (!feed) return;
    dispatch({ type: 'ADD_FEED', feed: { ...feed, active: !feed.active } });
  }

  const onTogglePipelineFeed = (id : string) => {
    const feed = state.feeds.find(f => f.id === id || f.url === id);
    if (!feed) return;
    dispatch({ type: 'ADD_FEED', feed: { ...feed, active: !feed.active } });
  }

  const onSetDcatApFeedLoadingStatus = (id: string, status: boolean) => {
    const feed = state.feeds.find(f => f.id === id || f.url === id);
    if (!feed) return;
    dispatch({ type: 'ADD_FEED', feed: { ...feed, loading: status } });
  }

  const onAddMapping = (url: string) => {

  }
  
  const onAddAlignment = (url: string) => {

  }

  const onFeedUpdate = (url: string) => {
    actions.loadDcatFeed(url);
  }

  const onAddFeed = async (url: string) => {
    await actions.loadDcatFeed(url);
    // // const feed = await getFeed(url)
    // // console.log('onAddFeed', feed)
    // // if (feed) setDcatApFeeds(dcatApFeeds.concat([feed]))

    // let oldFeeds: Feed[] = dcatApFeeds;

    // const client = new DcatApClient({
    //   preferLang: ["nl", "en", "fr"],
    //   maxPages: 100,               // safety limit
    //   maxDescribeDepth: 5
    // });
    
    // const members = []; // collect dataset entries (optionally)

    // let feed = await getFeed(url);
    // if (!feed) {
    //   console.error(`No feed found at ${url}`)
    //   return 
    // }
    // feed.loading = true;
    // setDcatApFeeds(oldFeeds.concat([feed]))
    
    // for await (const item of client.iterDatasets(url)) {
    //   // Each item corresponds to one dataset “member” found on some page
    //   console.log("Page:", item.pageUrl);
    //   console.log("Dataset IRI:", item.dataset.id);
    //   // printDcatEntry(item)
    //   // console.log(JSON.stringify(item, null, 2))
      
    //   // Inspect distributions (access/download URLs + mediatype/format)
      
    //   // set the dataset feed link
    //   console.log('ITEM', item)
    //   console.log('test',item.dataset.endpointURL, item.distributions?.length, !item.dataset.endpointURL && item.distributions?.length, item.distributions.map(e => e.accessURL || e.downloadURL).flat())
    //   item.dataset.feed = feed.id;
    //   if (!item.dataset.endpointURL?.length && item.distributions?.length) {
    //     item.dataset.endpointURL = item.distributions.map(e => e.accessURL || e.downloadURL).flat();
    //   }
      
    //   members.push(item.dataset);
    // }
    // console.log("Total members found:", members.length);
    
    // const updatedDatasets = datasets.concat(members.map(m => getDatasetObject(m)).filter(d => !!d))
    // setDatasets(updatedDatasets.filter((value, index, self) => {
    //   return self.findIndex(e => e.id === value.id) === index;
    // }));
    // // onSetDcatApFeedLoadingStatus(feed.id, false);
    // feed.loading = false;
    // setDcatApFeeds(oldFeeds.concat([feed]))

  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-gray-900">Data Management Portal</h1>
              <p className="text-gray-600 mt-2">
                {currentPage === 'rdf-portal' 
                  ? 'Manage your data catalog feeds and browse available datasets'
                  : currentPage === 'alignment-pipelines'
                  ? 'Manage alignment pipelines and browse configurations'
                  : currentPage === 'shape-registry'
                  ? 'Browse SHACL shapes and view their usage across datasets and pipelines'
                  : 'Documentation and guides for using the Data Management Portal'}
              </p>
            </div>
          </div>
          
          <nav className="overflow-x-auto">
            <div className="flex gap-1 -mb-px min-w-max sm:min-w-0">
              <button
                onClick={() => setCurrentPage('data-portal')}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'data-portal'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Database className="w-4 h-4" />
                Data Portal
              </button>
              {/* <button
                onClick={() => setCurrentPage('mapping-pipelines')}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'mapping-pipelines'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Workflow className="w-4 h-4" />
                Mapping Pipelines
              </button> */}
              <button
                onClick={() => setCurrentPage('rdf-portal')}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'rdf-portal'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Network className="w-4 h-4" />
                RDF Portal
              </button>
              <button
                onClick={() => setCurrentPage('alignment-pipelines')}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'alignment-pipelines'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Alignment Pipelines
              </button>
              <button
                onClick={() => {
                  setCurrentPage('shape-registry');
                  setSelectedProfileId(null);
                }}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'shape-registry'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Shapes className="w-4 h-4" />
                Dataset Profile Registry
              </button>
              <button
                onClick={() => setCurrentPage('documentation')}
                className={`flex items-center gap-2 px-2 sm:px-4 py-3 border-b-2 mr-0 ml-auto transition-colors whitespace-nowrap text-sm sm:text-base ${
                  currentPage === 'documentation'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Documentation
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'data-portal' ? (
          <DataPortalPage 
            onNavigateToProfile={handleNavigateToShape}
          />
        // ) : currentPage === 'mapping-pipelines' ? (
        //   <AlignmentPipelinesPage
        //     feeds={pipelineFeeds} 
        //     pipelines={pipelines}
        //     profiles={profiles}
        //     onAddPipeline={handleAddPipeline}
        //     onTogglePipeline={handleTogglePipeline}
        //     onRemovePipeline={handleRemovePipeline}
        //     onNavigateToProfile={handleNavigateToShape}
        //     onTogglePipelineFeed={onTogglePipelineFeed}
        //   />
        ) : currentPage === 'rdf-portal' ? (
          <RdfPortalPage 
            datasets={state.datasets}
            feeds={state.feeds}
            pipelines={state.pipelines} 
            profiles={state.profiles}
            // shapes={shapes}
            onNavigateToProfile={handleNavigateToShape}
            onToggleDatasetFeed={onToggleDatasetFeed}
            // onAddFeed={onAddFeed}
            // onAddAlignment={onAddAlignment}
            // onAddMapping={onAddMapping}
          />
        ) : currentPage === 'alignment-pipelines' ? (
          <AlignmentPipelinesPage
            feeds={state.feeds} 
            pipelines={state.pipelines}
            profiles={state.profiles}
            onAddPipeline={handleAddPipeline}
            onTogglePipeline={handleTogglePipeline}
            onRemovePipeline={handleRemovePipeline}
            onNavigateToProfile={handleNavigateToShape}
            onTogglePipelineFeed={onTogglePipelineFeed}
          />
        ) : currentPage === 'shape-registry' ? (
          <ShapeRegistryPage 
            profiles={state.profiles}
            datasets={state.datasets}
            pipelines={state.pipelines}
            selectedProfileId={selectedProfileId}
            onClearSelection={() => setSelectedProfileId(null)}
          />
        ) : (
          <DocumentationPage />
        )}
      </main>
    </div>
  );
}