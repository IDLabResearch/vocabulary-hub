import { PipelineManager } from './PipelineManager';
import { PipelineBrowser } from './PipelineBrowser';
import { Pipeline, Feed, Profile } from '../util/types';

interface AlignmentPipelinesPageProps {
  pipelines: Pipeline[];
  feeds: Feed[]
  profiles: Profile[];
  onAddPipeline: (pipeline: Pipeline) => void;
  onTogglePipeline: (id: string) => void;
  onRemovePipeline: (id: string) => void;
  onNavigateToProfile: (shapeId: string) => void;
  onTogglePipelineFeed: (feedId: string) => void;
}

export function AlignmentPipelinesPage({ 
  feeds,
  pipelines, 
  profiles,
  onAddPipeline, 
  onTogglePipeline, 
  onRemovePipeline,
  onNavigateToProfile,
  onTogglePipelineFeed,
}: AlignmentPipelinesPageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <PipelineManager 
          // pipelines={pipelines}
          feeds={feeds}
          profiles={profiles}
          // shapes={[]}
          onAddPipeline={onAddPipeline}
          // onTogglePipeline={onTogglePipeline}
          // onRemovePipeline={onRemovePipeline}
          onTogglePipelineFeed={onTogglePipelineFeed}
        />
      </div>
      
      <div className="lg:col-span-2">
        <PipelineBrowser 
          pipelines={pipelines}
          profiles={profiles}
          feeds={feeds}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>
    </div>
  );
}
