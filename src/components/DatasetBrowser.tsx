import { useState, useEffect } from 'react';
import { Database, Calendar, Tag, ExternalLink, Search, CheckSquare, Square, Shapes as ShapesIcon, Shapes } from 'lucide-react';
import { Feed, Pipeline, Dataset, Profile } from '../util/types';
import { Virtuoso } from "react-virtuoso";

// import { Feed, Dataset, generateMockDatasets, getShapeName } from '../util/mock';

interface DatasetBrowserProps {
  feeds: Feed[];
  pipelines: Pipeline[];
  datasets: Dataset[];
  selectedDatasets: Set<string>;
  targetProfile?: string | null;
  profiles: Profile[];
  onToggleDataset: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onNavigateToProfile: (shapeId: string) => void;
}

export function DatasetBrowser({ 
  feeds, 
  pipelines, 
  datasets,
  selectedDatasets, 
  targetProfile, 
  profiles,
  onToggleDataset, 
  onSelectAll, 
  onDeselectAll,
  onNavigateToProfile
}: DatasetBrowserProps) {
  // const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [shapeInput, setShapeInput] = useState('');
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);

  // useEffect(() => {
  //   const mockDatasets = generateMockDatasets(feeds);
  //   setDatasets(mockDatasets);
  // }, [feeds]);

  const activeFeedIds = feeds.filter(feed => feed.active).map(feed => feed.id)
  const filteredDatasets = datasets.filter(dataset => {
    const hasActiveFeed = activeFeedIds.includes(dataset.feedId as string)

    const matchesSearch = searchTerm === '' || 
      dataset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.publisher?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKeywords = selectedKeywords.length === 0 ||
      selectedKeywords.some(kw => Array.isArray(dataset.keyword) && 
        (dataset.keyword as string[]).includes(kw));

    const matchesShapes = selectedShapes.length === 0 ||
      selectedShapes.some(shapeId => 
        dataset.shapeId === shapeId ||
        // Also include datasets that can be aligned to the selected shape
        pipelines.some(p => 
          p.sourceShape === dataset.shapeId && 
          p.targetProfile === shapeId
        )
      );

    console.log(dataset.id, activeFeedIds, dataset, hasActiveFeed, matchesSearch, matchesKeywords, matchesShapes)
    return hasActiveFeed && matchesSearch && matchesKeywords && matchesShapes;
  });

  const allKeywords = Array.from(
    new Set(datasets.flatMap(d => d.keyword))
  ).sort();

  // Get unique shapes from datasets and pipeline targets
  const allShapeIds = Array.from(
    new Set([
      ...datasets.map(d => d.shapeId),
      ...pipelines.map(p => p.targetProfile)
    ])
  ).sort();

  // Filter dropdown options based on input and exclude already selected
  const filteredKeywordOptions = allKeywords.filter(kw => 
    (kw as string)?.toLowerCase().includes(keywordInput.toLowerCase()) &&
    !selectedKeywords.includes(kw as string)
  );

  // const filteredShapeOptions = allShapeIds.filter(shapeId => {
  //   const shapeName = getShapeName(shapeId as string);
  //   return (
  //     shapeName?.toLowerCase().includes(shapeInput.toLowerCase()) &&
  //     !selectedShapes.includes(shapeId as string)
  //   );
  // });

  const handleAddKeyword = (keyword: string) => {
    if (keyword && !selectedKeywords.includes(keyword)) {
      setSelectedKeywords([...selectedKeywords, keyword]);
      setKeywordInput('');
      setShowKeywordDropdown(false);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(kw => kw !== keyword));
  };

  // const handleAddShape = (shapeId: string) => {
  //   if (shapeId && !selectedShapes.includes(shapeId)) {
  //     setSelectedShapes([...selectedShapes, shapeId]);
  //     setShapeInput('');
  //     setShowShapeDropdown(false);
  //   }
  // };

  // const handleRemoveShape = (shapeId: string) => {
  //   setSelectedShapes(selectedShapes.filter(s => s !== shapeId));
  // };

  const handleSelectAll = () => {
    const allFilteredIds = filteredDatasets.map(d => d.id);
    onSelectAll(allFilteredIds);
  };

  const allFilteredSelected = filteredDatasets.length > 0 && 
    filteredDatasets.every(d => selectedDatasets.has(d.id));

  // Helper function to determine dataset alignment status
  const getAlignmentStatus = (dataset: Dataset): 'direct' | 'pipeline' | 'none' => {
    if (!targetProfile) return 'none';
    
    // Check if dataset is already using the target shape (direct match)
    if (dataset.shapeId === targetProfile) {
      return 'direct';
    }
    
    // Check if dataset can be aligned via a pipeline
    const canAlign = pipelines.some(p => 
      p.sourceShape === dataset.shapeId && 
      p.targetProfile === targetProfile
    );
    
    return canAlign ? 'pipeline' : 'none';
  };

  // Helper function to get the background color based on alignment and selection
  const getCardClassName = (dataset: Dataset): string => {
    const alignmentStatus = getAlignmentStatus(dataset);
    const isSelected = selectedDatasets.has(dataset.id);
    
    if (isSelected) {
      return 'border-blue-400 bg-blue-50 shadow-md';
    }
    
    switch (alignmentStatus) {
      case 'direct':
        return 'border-green-300 bg-green-50 hover:border-green-400 hover:shadow-md';
      case 'pipeline':
        return 'border-green-200 bg-green-50/50 hover:border-green-300 hover:shadow-md';
      default:
        return 'border-gray-200 hover:border-blue-300 hover:shadow-md';
    }
  };

  console.log("TEST", datasets, datasets.map(d => d.distribution))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-gray-900">Available Datasets</h2>
          <span className="ml-auto text-gray-600">
            {filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'}
            {selectedDatasets.size > 0 && (
              <span className="ml-2">
                ({selectedDatasets.size} selected)
              </span>
            )}
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {filteredDatasets.length > 0 && (
          <div className="mb-4">
            <button
              onClick={allFilteredSelected ? onDeselectAll : handleSelectAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Select All Filtered
                </>
              )}
            </button>
          </div>
        )}

        {targetProfile && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">Alignment Status for {targetProfile}:</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
                <span className="text-gray-600">Direct match (already using target profile)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50/50 border-2 border-green-200 rounded"></div>
                <span className="text-gray-600">Can be aligned via pipeline</span>
              </div>
            </div>
          </div>
        )}

        {/*allShapeIds.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-700 mb-2">Filter by shape:</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Add shape filter..."
                value={shapeInput}
                onChange={(e) => setShapeInput(e.target.value)}
                onFocus={() => setShowShapeDropdown(true)}
                onBlur={() => setTimeout(() => setShowShapeDropdown(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {showShapeDropdown && filteredShapeOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredShapeOptions.map(shapeId => (
                    <button
                      key={shapeId as string}
                      onClick={() => handleAddShape(shapeId as string)}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors"
                    >
                      {getShapeName(shapeId as string)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedShapes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedShapes.map(shapeId => (
                  <button
                    key={shapeId}
                    onClick={() => handleRemoveShape(shapeId)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-full text-sm hover:bg-purple-700 transition-colors"
                  >
                    {getShapeName(shapeId)}
                    <span className="ml-1">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )*/}

        {allKeywords.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-700 mb-2">Filter by keyword:</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Add keyword filter..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onFocus={() => setShowKeywordDropdown(true)}
                onBlur={() => setTimeout(() => setShowKeywordDropdown(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showKeywordDropdown && filteredKeywordOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredKeywordOptions.map(keyword => (
                    <button
                      key={keyword as string}
                      onClick={() => handleAddKeyword(keyword as string)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      {keyword as string}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedKeywords.map(keyword => (
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
        )}
      </div>

      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
        {filteredDatasets.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {feeds.length === 0
                ? 'No active feeds. Add feeds to see datasets.'
                : 'No datasets found matching your criteria.'}
            </p>
          </div>
        ) : (

          <div className="p-6 space-y-4">
            <DatasetListVirtualized 
                filteredDatasets={filteredDatasets}
                selectedDatasets={selectedDatasets}
                pipelines={pipelines}
                feeds={feeds}
                onToggleDataset={onToggleDataset}
                getCardClassName={getCardClassName}
                onNavigateToProfile={onNavigateToProfile}
              />
            {/* {filteredDatasets.map((dataset) => (
              
            ))} */}
          </div>
        )}
      </div>
    </div>
  );
}

interface DatasetListVirtualizedProps {
  filteredDatasets: Dataset[];
  selectedDatasets: Set<string>;
  pipelines: Pipeline[];
  feeds: Feed[];
  onToggleDataset: (id: string) => void;
  getCardClassName: (dataset: Dataset) => string;
  onNavigateToProfile: (shapeId: string) => void;
  [key: string]: any;
}

export function DatasetListVirtualized({ 
  filteredDatasets, selectedDatasets, onToggleDataset, getCardClassName, onNavigateToProfile, pipelines, feeds, ...props
}: DatasetListVirtualizedProps) {

  const distributions = filteredDatasets.map(d => d.distribution)
  console.log('filtered', distributions)
  console.log('filtered2', distributions.map(distribution => distribution.map(d => d.accessURL)))

  return (
    <Virtuoso
      style={{ height: "80vh" }}
      data={filteredDatasets}
      itemContent={(_, dataset) => (
        <div className="p-6">
          <article
            className={`p-5 border rounded-lg transition-all ${getCardClassName(dataset)}`}
              >
                <div className="flex items-start gap-4 mb-3">
                  <button
                    onClick={() => onToggleDataset(dataset.id)}
                    className="flex-shrink-0 mt-1 text-gray-600 hover:text-blue-600 transition-colors"
                    title={selectedDatasets.has(dataset.id) ? 'Deselect' : 'Select'}
                  >
                    {selectedDatasets.has(dataset.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-gray-900">
                      {dataset.title}
                    </h3>
                  </div>
                  {/* <a
                    href={dataset.distribution[0].accessURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="View dataset"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a> */}
                </div>

                <p className="text-gray-600 mb-3 ml-9">
                  {dataset.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3 ml-9">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>{dataset.publisher}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Published: {dataset.issued && typeof (dataset.issued as Date).getMonth === 'function' ? (dataset.issued as Date).toDateString() : dataset.issued as string}</span>
                  </div>
                </div>

                {
                  dataset.profile && 
                  <div className="flex items-start gap-2 mb-3 ml-9">
                    <Shapes className="w-4 h-4 mt-1" />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onNavigateToProfile(dataset.profile?.id as string)}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm border border-purple-200 hover:bg-purple-200 transition-colors inline-flex items-center gap-1"
                        title="View shape in registry"
                      >
                        <ShapesIcon className="w-3 h-3" />
                        {dataset.profile?.title as string}
                      </button>
                    </div>
                  </div>
                }

                <div className="flex items-start gap-2 mb-3 ml-9">
                  <Tag className="w-4 h-4 mt-1" />
                  <div className="flex flex-wrap gap-2">
                    {(dataset.keyword as string[] || []).map(keyword => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {pipelines.filter(p => dataset.shapeId && p.sourceShape === dataset.shapeId).length > 0 && (
                  <div className="ml-9 mb-3">
                    <p className="text-sm text-gray-600 mb-2">Can be aligned to:</p>
                    <div className="flex flex-wrap gap-2">
                      {dataset.shapeId && pipelines
                        .filter(p => p.sourceShape === dataset.shapeId)
                        .map(pipeline => (
                          <button
                            key={pipeline.id}
                            onClick={() => onNavigateToProfile(pipeline.id as string)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-sm hover:bg-green-100 transition-colors"
                            title="View target shape in registry"
                          >
                            <ShapesIcon className="w-3 h-3 text-green-700" />
                            <span className="text-green-700">{pipeline.id as string}</span>
                            <span className="text-gray-400">via</span>
                            <span className="text-gray-600">{pipeline.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="ml-9 mb-3">
                  <p className="text-sm text-gray-600 mb-2">Distributions</p>
                  <div className="flex flex-wrap gap-2">
                    {dataset.distribution
                      .map(distribution => (
                        <div className="flex flex-wrap gap-2">   
                          <a
                            href={distribution.accessURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors text-wrap"
                            title="View dataset"
                          >
                            {/* <ExternalLink className="w-4 h-4" /> */}
                            <label className='text-wrap'>{distribution.accessURL}</label>    
                          </a>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 ml-9">
                  <span className="text-sm text-gray-500">
                    Source: {feeds.filter(feed => feed.id === dataset.feedId)[0]?.name}
                  </span>
                </div>
          </article>
        </div>
      )}
    />
  );
}
