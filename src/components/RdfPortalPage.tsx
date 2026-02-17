import { useState, useEffect } from 'react';
import { FeedManager } from './FeedManager';
import { DatasetBrowser } from './DatasetBrowser';
import { ExportDatasets } from './ExportDatasets';
// import { Pipeline } from '../App';
// import { Feed, Dataset, ShaclShape, mockFeeds, generateMockDatasets } from '../util/mock';
import { Feed, Dataset, Pipeline, Profile } from '../util/types';

interface RdfPortalPageProps {
  pipelines: Pipeline[];
  feeds: Feed[];
  datasets: Dataset[];
  profiles: Profile[];
  // shapes: ShaclShape[];
  onNavigateToProfile: (shapeId: string) => void;
  onToggleDatasetFeed: (id: string) => void;
}

export function RdfPortalPage({ pipelines, datasets, feeds, profiles, onNavigateToProfile, onToggleDatasetFeed }: RdfPortalPageProps) {
  // const [feeds, setFeeds] = useState<Feed[]>(mockFeeds);
  // const [allDatasets, setAllDatasets] = useState<Dataset[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [targetShape, setTargetShape] = useState<string | null>(null);


  // useEffect(() => {
  //   const mockDatasets = generateMockDatasets(feeds);
  //   setAllDatasets(mockDatasets);
  // }, [feeds]);

  // const handleAddFeed = (name: string, url: string) => {
  //   const newFeed: Feed = {
  //     id: Date.now().toString(),
  //     name,
  //     url,
  //     active: true
  //   };
  //   setFeeds([...feeds, newFeed]);
  // };

  // const handleToggleFeed = (id: string) => {
  //   setFeeds(feeds.map(feed => 
  //     feed.id === id ? { ...feed, active: !feed.active } : feed
  //   ));
  // };

  // const handleRemoveFeed = (id: string) => {
  //   setFeeds(feeds.filter(feed => feed.id !== id));
  // };

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

  const handleExport = (targetShape: string | null) => {
    const selectedDatasetObjects = datasets.filter(d => selectedDatasets.has(d.id));
    console.log('Exporting datasets:', selectedDatasetObjects);
    if (targetShape) {
      console.log('Target shape:', targetShape);
    }
  };

  const selectedDatasetObjects = datasets.filter(d => selectedDatasets.has(d.id));

  console.log('1', feeds)
  console.log('2', datasets)
  console.log('3', selectedDatasets)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <FeedManager 
          feeds={feeds}
          onAddFeed={() => {}}
          onToggleFeed={onToggleDatasetFeed}
          onRemoveFeed={() => {}}
          canAddFeed={false}
        />
        
        <ExportDatasets 
          selectedDatasets={selectedDatasetObjects}
          pipelines={pipelines}
          profiles={profiles}
          onExport={handleExport}
          onTargetChange={(shape) => {
            setTargetShape(shape);
          }}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>
      
      <div className="lg:col-span-2">
        <DatasetBrowser 
          feeds={feeds.filter(f => f.active)} 
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
