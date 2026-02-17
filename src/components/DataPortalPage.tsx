import { useState, useEffect } from 'react';
import { FeedManager } from './FeedManager';
import { DatasetBrowser } from './DatasetBrowser';
import { ExportDatasets } from './ExportDatasets';
import { MapDatasets } from './MapDatasets';
// import { Pipeline } from '../App';
// import { Feed, Dataset, ShaclShape, mockFeeds, generateMockDatasets } from '../util/mock';
import { Feed, Dataset, Pipeline, Profile } from '../util/types';
import { DcatApClient, DcatApDataset, getDatasetObject, printDcatEntry } from '../util/DcatApLoader';
import { getFeed } from '../util/util';

interface DataPortalPageProps {
  pipelines: Pipeline[];
  feeds: Feed[];
  datasets: Dataset[];
  
  profiles: Profile[];
  // shapes: ShaclShape[];
  onNavigateToProfile: (shapeId: string) => void;
  onToggleDatasetFeed: (id: string) => void;
  onFeedUpdate: (url: string) => void;
  onAddFeed: (url: string) => Promise<void>
  // onSetDcatApFeedLoadingStatus: (id: string, state: boolean) => void;
  
  
  // onAddAlignment: (url: string) => void
  // onAddMapping: (url: string) => void
}

export function DataPortalPage({ pipelines, datasets, feeds, profiles, onNavigateToProfile, onToggleDatasetFeed, onAddFeed, onFeedUpdate,/* onSetDcatApFeedLoadingStatus*/}: DataPortalPageProps) {
  
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());

  const handleToggleDataset = (id: string) => {
    const newSelected = new Set(selectedDatasets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDatasets(newSelected);
  };
  
  const handleSelectAll = (ids: string[]) => {
    setSelectedDatasets(new Set([...selectedDatasets, ...ids]));
  };
  
  const handleDeselectAll = () => {
    setSelectedDatasets(new Set());
  };
  
  const selectedDatasetObjects = datasets.filter(d => selectedDatasets.has(d.id));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="space-y-6">
    <FeedManager 
    feeds={feeds} // todo: update
    onAddFeed={onAddFeed}
    onToggleFeed={onToggleDatasetFeed}
    onRemoveFeed={() => {}}
    canAddFeed={true}
    />
    
    <MapDatasets 
    selectedDatasets={selectedDatasetObjects}
    pipelines={pipelines}
    profiles={profiles}
    feeds={feeds}
    onNavigateToProfile={onNavigateToProfile}
    onFeedUpdate={onFeedUpdate}
    />
    </div>
    
    <div className="lg:col-span-2">
    <DatasetBrowser 
    feeds={feeds.filter(f => f.active)}  // todo: reset this to feeds
    pipelines={pipelines}
    datasets={datasets}
    selectedDatasets={selectedDatasets}
    profiles={profiles}
    // targetShape={targetShape}
    onToggleDataset={handleToggleDataset}
    onSelectAll={handleSelectAll}
    onDeselectAll={handleDeselectAll}
    onNavigateToProfile={onNavigateToProfile}
    />
    </div>
    </div>
  );
}
