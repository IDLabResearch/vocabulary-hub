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
import { RdfPortalPage } from './components/RdfPortalPage';
import { DcatApClient, getDatasetObject } from './util/DcatApLoader';

type Page = 'data-portal' | /*'mapping-pipelines' |*/ 'rdf-portal' | 'alignment-pipelines' | 'shape-registry' | 'documentation';

const dcatApFeedUrl = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/dcat-ap-feed"
const pipelineFeedUrl = "https://pod.rubendedecker.be/scholar/projects/deployEMDS/feeds/pipelines-feed"


export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('documentation');

  const [profiles, setProfiles] = useState<Profile[]>([])

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [pipelineFeeds, setPipelineFeeds] = useState<Feed[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([]); 

  const [dcatApFeeds, setDcatApFeeds] = useState<Feed[]>([])
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [rdfDatasets, setRdfDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    async function runInit() {
      await loadPipelineFeeds()
      await loadAndSetDcatApFeedAndDatasets(dcatApFeedUrl)
    }

    runInit()
    return () => {
      // connection.disconnect();
    };
  }, []);

  const loadAndSetDcatApFeedAndDatasets = async (feedUrl: string) => {
    console.log('Updating feed and loading datasets of', feedUrl)
    const updatedDatasets = datasets.slice()
    const datasetIds = updatedDatasets.map(d => d.id)
    const datasetFeed = await getFeed(feedUrl)
      if (datasetFeed){ 
        // todo: fix loading screen showing here
        datasetFeed.loading = false;
        let newDatasets: Dataset[] = []
        let newProfiles: Profile[] = []
        for await (const loadedDataset of loadDcatApMembers(datasetFeed)) {
          const matchingDatasetIndex = datasetIds.indexOf(loadedDataset.id)
          if (matchingDatasetIndex !== -1) {
            let matchingDataset = updatedDatasets[matchingDatasetIndex]
            if (matchingDataset.distribution) {
              matchingDataset.distribution.concat(loadedDataset.distribution)
            } else {
              matchingDataset.distribution = loadedDataset.distribution
            }
            updatedDatasets[matchingDatasetIndex] = matchingDataset
          } else {
            newDatasets = newDatasets.concat([loadedDataset])
            if (loadedDataset.conformsTo) { 
              newProfiles = newProfiles.concat([loadedDataset.conformsTo as Profile]) 
            }
          }
        }
        // setDcatApFeeds(dcatApFeeds.concat([datasetFeed]))
        setDcatApFeeds(dcatApFeeds.concat([datasetFeed]).filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        ))
        console.log('TESTEST', updatedDatasets.map(d => d.distribution), newDatasets.map(d => d.distribution))
        setDatasets(updatedDatasets.concat(newDatasets).filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        ))
        setProfiles(profiles.concat(newProfiles).filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        ))
      }
  }

  const loadPipelineFeeds = async () => {
     const pipelineFeed = await getFeed(pipelineFeedUrl)
      if (pipelineFeed) {
        setPipelineFeeds(pipelineFeeds.concat(pipelineFeed))
        let newPipelines : Pipeline[] = []
        for await (const pipeline of loadPipelineMembers(pipelineFeed)) {
          newPipelines = newPipelines.concat(pipeline)
        }
        setPipelines(pipelines.concat(newPipelines).filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        ))
      }
  }

  console.log('feeds', dcatApFeeds)
  console.log('datasets', datasets)
  console.log('pipelines', pipelines)
  console.log('profiles', profiles)

  const handleAddPipeline = (pipeline: Pipeline) => {
    setPipelines(pipelines.concat([pipeline]))

    // todo:: persist changes on solid pod?
  };

  const handleTogglePipeline = (id: string) => {
    setPipelines(pipelines.map(pipeline => 
      pipeline.id === id ? { ...pipeline, active: !pipeline.active } : pipeline
    ));
  };

  const handleRemovePipeline = (id: string) => {
    setPipelines(pipelines.filter(pipeline => pipeline.id !== id));
  };

  const handleNavigateToShape = (shapeId: string) => {
    setSelectedProfileId(shapeId);
    setCurrentPage('shape-registry');
  };

  const onToggleDatasetFeed = (id : string) => {
    console.log('toggling', id)
    setDcatApFeeds(dcatApFeeds.map(feed => 
      feed.id === id ? { ...feed, active: !feed.active } : feed
    ));
  }

  const onTogglePipelineFeed = (id : string) => {
    setPipelineFeeds(pipelineFeeds.map(feed => 
      feed.id === id ? { ...feed, active: !feed.active } : feed
    ));
  }

  const onSetDcatApFeedLoadingStatus = (id: string, status: boolean) => {
    console.log('setting feed status', id, status, dcatApFeeds)
    setDcatApFeeds(dcatApFeeds.map(feed => 
      feed.id === id ? { ...feed, loading: status } : feed
    ));
  }

  const onAddMapping = (url: string) => {

  }
  
  const onAddAlignment = (url: string) => {

  }

  const onFeedUpdate = (url: string) => {
    loadAndSetDcatApFeedAndDatasets(url)
  }
  
  const onAddFeed = async (url: string) => {
    loadAndSetDcatApFeedAndDatasets(url)
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
            datasets={datasets}
            feeds={dcatApFeeds}
            pipelines={pipelines} 
            profiles={profiles}
            // shapes={shapes}
            onNavigateToProfile={handleNavigateToShape}
            onToggleDatasetFeed={onToggleDatasetFeed}
            onAddFeed={onAddFeed}
            onFeedUpdate={onFeedUpdate}
            // onSetDcatApFeedLoadingStatus={onSetDcatApFeedLoadingStatus}
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
            datasets={datasets}
            feeds={dcatApFeeds}
            pipelines={pipelines} 
            profiles={profiles}
            // shapes={shapes}
            onNavigateToProfile={handleNavigateToShape}
            onToggleDatasetFeed={onToggleDatasetFeed}
            // onAddFeed={onAddFeed}
            // onAddAlignment={onAddAlignment}
            // onAddMapping={onAddMapping}
          />
        ) : currentPage === 'alignment-pipelines' ? (
          <AlignmentPipelinesPage
            feeds={pipelineFeeds} 
            pipelines={pipelines}
            profiles={profiles}
            onAddPipeline={handleAddPipeline}
            onTogglePipeline={handleTogglePipeline}
            onRemovePipeline={handleRemovePipeline}
            onNavigateToProfile={handleNavigateToShape}
            onTogglePipelineFeed={onTogglePipelineFeed}
          />
        ) : currentPage === 'shape-registry' ? (
          <ShapeRegistryPage 
            profiles={profiles}
            datasets={datasets}
            pipelines={pipelines}
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