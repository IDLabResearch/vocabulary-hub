import React, { useState } from 'react';
import { FeedManager } from './FeedManager';
import { DatasetBrowser } from './DatasetBrowser';
import { MapDatasets } from './MapDatasets';
import type { Dataset, Pipeline, Profile } from '../util/types';
import { useFeedState, useFeedActions, useFeedDispatch } from '../stores/FeedStore';

interface DataPortalPageProps {
  onNavigateToProfile: (shapeId: string) => void;
}

export function DataPortalPage({ onNavigateToProfile }: DataPortalPageProps) {
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const state = useFeedState();
  const actions = useFeedActions();
  const dispatch = useFeedDispatch();

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

  const selectedDatasetObjects = state.datasets.filter(d => selectedDatasets.has(d.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <FeedManager
          feeds={state.feeds}
          onAddFeed={(url: string) => actions.loadDcatFeed(url)}
          onToggleFeed={(id: string) => {
            const feed = state.feeds.find(f => f.id === id || f.url === id);
            if (!feed) return;
            dispatch({ type: 'ADD_FEED', feed: { ...feed, active: !feed.active } });
          }}
          onRemoveFeed={() => {}}
          canAddFeed={true}
        />

        <MapDatasets
          selectedDatasets={selectedDatasetObjects}
          pipelines={state.pipelines}
          profiles={state.profiles}
          feeds={state.feeds}
          onNavigateToProfile={onNavigateToProfile}
          onFeedUpdate={(url: string) => actions.loadDcatFeed(url)}
        />
      </div>

      <div className="lg:col-span-2">
        <DatasetBrowser
          feeds={state.feeds.filter(f => f.active)}
          pipelines={state.pipelines}
          datasets={state.datasets}
          selectedDatasets={selectedDatasets}
          profiles={state.profiles}
          onToggleDataset={handleToggleDataset}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>
    </div>
  );
}
