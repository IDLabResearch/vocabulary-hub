import { useState, useEffect } from 'react';
import { Download, Package, Shapes } from 'lucide-react';
import { Profile, Pipeline, Dataset } from '../util/types';
import { DCAT_AP_FEED_INFO, handlePipelineExport, VIA_PIPELINE_INFO } from '../util/export';

interface ExportDatasetsProps {
  selectedDatasets: Dataset[];
  pipelines: Pipeline[];
  profiles: Profile[];
  onExport: (targetShape: string | null) => void;
  onTargetChange?: (targetShape: string | null) => void;
  onNavigateToProfile: (shapeId: string) => void;
}

export function ExportDatasets({ selectedDatasets, pipelines, profiles, onExport, onTargetChange, onNavigateToProfile }: ExportDatasetsProps) {
  const [targetProfileId, settargetProfileId] = useState<string | null>(null);
  const [graphstoreUrl, setGraphstoreUrl] = useState<string | undefined>("http://host.docker.internal:7878");
  const [targetNamedGraph, setTargetNamedGraph] = useState<string | undefined>("default");

  // Get unique shapes from selected datasets
  const relevantProfileIds = Array.from(
    new Set(selectedDatasets.map(d => (d.conformsTo as Profile).id))
  );

  // Find all shapes that can be reached from any of the selected datasets
  const availableTargetProfileIds = profiles.filter(profile => {
    // A shape is available if:
    // 1. At least one selected dataset uses it directly
    const hasDirectMatch = relevantProfileIds.includes(profile.id);
    
    // 2. OR at least one selected dataset can be transformed to it via a pipeline
    const hasPipelineMatch = selectedDatasets.some(dataset => 
      pipelines.some(p => 
        p.sourceProfile === dataset.profile?.id && 
        p.targetProfile === profile.id
      )
    );
    
    return hasDirectMatch || hasPipelineMatch;
  }).map(profile => profile.id);

  // Reset target shape if it's no longer available
  useEffect(() => {
    if (targetProfileId && !availableTargetProfileIds.includes(targetProfileId)) {
      settargetProfileId(null);
    }
  }, [availableTargetProfileIds, targetProfileId]);

  // Notify parent of target changes
  useEffect(() => {
    if (onTargetChange) {
      onTargetChange(targetProfileId);
    }
  }, [targetProfileId, onTargetChange]);

  const getAlignedDatasetsAndPipelines = () => {
    // if (!targetProfileId) return { datasets: [], via: [] };

    const datasets: Dataset[] = []
    const via: { dataset: Dataset, pipeline: Pipeline}[] = []

    selectedDatasets.forEach(dataset => {
      // We decide a dataset as selected if its exported as is OR if it complies with the profile alignment filter
      if (!targetProfileId || dataset.profile?.id === targetProfileId) {
        datasets.push(dataset)
      // For pipelines, we only align if an alignment is asked for explicitly with a target profile
      } else if (targetProfileId && pipelines.some((p) => 
        p.sourceProfile === dataset.profile?.id && 
        p.targetProfile === targetProfileId
      )) {
        const pipeline = pipelines.filter((p) => 
          p.sourceProfile === dataset.profile?.id && 
          p.targetProfile === targetProfileId
        )[0] as Pipeline
        via.push({ dataset, pipeline })
      }
    });

    return({datasets, via})
  }

  // Calculate how many datasets can be aligned to the target shape
  const getAlignableCount = (): { direct: number; pipeline: number } => {
    if (!targetProfileId) return { direct: 0, pipeline: 0 };
    
    const info = getAlignedDatasetsAndPipelines()
    return { direct: info.datasets.length, pipeline: info.via.length }
  };

  const alignableCount = getAlignableCount();

  const handleExport = () => {
    
    const info = getAlignedDatasetsAndPipelines()

    console.log('EXPORTING', info, selectedDatasets)

    const direct: {title: string, accessPoint: string}[] = info.datasets.map(dataset => {
      return({
        title: dataset.title, accessPoint: dataset.distribution[0].accessURL as string || "" // todo: lots of error handling everywhere
      })
    });

    const via: {
      dataset: {
        title: string,
        accessPoint: string,
      },
      pipeline: {
        title: string,
        endpointURL: string,
        query?: string
      },
    }[] = info.via.map((({dataset, pipeline}) => {
      return({
        dataset: { title: dataset.title, accessPoint: dataset.distribution[0].accessURL as string},
        pipeline: { title: pipeline.name, endpointURL: pipeline.endpoint as string, query: pipeline.query }
      })
    }))

    const options = { targetNamedGraph, graphstoreUrl }
    console.log('exporting', direct, via, options)
    handlePipelineExport(direct, via, options)
  };

  const alignedTotalCount = alignableCount.direct + alignableCount.pipeline

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-5 h-5 text-blue-600" />
        <h2 className="text-gray-900">Export Datasets</h2>
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
            Target graphstore
          </label>
          <input
            value={graphstoreUrl}
            placeholder='Target graphstore URL'
            onChange={(e) => setGraphstoreUrl(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          /> 
        </div>
        <div>
          <label className="block text-gray-700 mb-2">
            Target named graph
          </label>
          <input
            value={targetNamedGraph}
            placeholder='Target named graph in graphstore'
            onChange={(e) => setTargetNamedGraph(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
          /> 
        </div>
      

        {selectedDatasets.length > 0 && (
          <>
            <div>
              <label className="block text-gray-700 mb-2">
                Align To (Optional)
              </label>
              <select
                value={targetProfileId || ''}
                onChange={(e) => settargetProfileId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No alignment - export as-is</option>
                {availableTargetProfileIds.map(profileId => (
                  <option key={profileId} value={profileId}>
                    {profiles.filter(p => p.id === profileId)[0]?.title}
                  </option>
                ))}
              </select>
              {targetProfileId && (
                <button
                  onClick={() => onNavigateToProfile(targetProfileId)}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
                >
                  <Shapes className="w-3 h-3" />
                  View shape in registry
                </button>
              )}
            </div>

            {targetProfileId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="text-blue-900 mb-1">Alignment Summary:</p>
                <ul className="space-y-1 text-blue-800">
                  {alignableCount.direct > 0 && (
                    <li>• {alignableCount.direct} dataset{alignableCount.direct !== 1 ? 's' : ''} already using target shape</li>
                  )}
                  {alignableCount.pipeline > 0 && (
                    <li>• {alignableCount.pipeline} dataset{alignableCount.pipeline !== 1 ? 's' : ''} will be transformed via pipeline</li>
                  )}
                </ul>
              </div>
            )}

            { targetProfileId 
            ? <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export {alignedTotalCount} aligned dataset{alignedTotalCount !== 1 ? 's' : ''}
                {targetProfileId && ` to ${profiles.filter(p => p.id === targetProfileId)[0]?.title}`}
              </button>
            : <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export {selectedDatasets.length} Dataset{selectedDatasets.length !== 1 ? 's' : ''}
                {targetProfileId && ` to ${profiles.filter(p => p.id === targetProfileId)[0]?.title}`}
              </button>
            }
            
          </>
        )}

        {selectedDatasets.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            Select datasets from the browser to export
          </p>
        )}
      </div>
    </div>
  );
}
