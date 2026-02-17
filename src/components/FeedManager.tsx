import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Rss, Loader, LoaderCircle } from 'lucide-react';
import { Feed } from '../util/types';

interface FeedManagerProps {
  feeds: Feed[];
  onAddFeed: (url: string) => void;
  onToggleFeed: (id: string) => void;
  onRemoveFeed: (id: string) => void;
  canAddFeed: boolean
}

export function FeedManager({ feeds, onAddFeed, onToggleFeed, onRemoveFeed, canAddFeed }: FeedManagerProps) {
  // const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedUrl.trim()) {
      onAddFeed(feedUrl.trim());
      setFeedUrl('');
      setShowForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Feed Sources</h2>
          </div>
          {canAddFeed && 
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Feed
            </button>
          }
        </div>
      </div>

      {showForm && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedUrl" className="block text-gray-700 mb-1.5">
                Feed URL
              </label>
              <input
                type="url"
                id="feedUrl"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/dcat-ap.rdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Feed
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  // setFeedName('');
                  setFeedUrl('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6">
        <div className="space-y-3">
          {feeds.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No feeds added yet. Click "Add Feed" to get started.
            </p>
          ) : (
            feeds.map((feed) => (
              <div
                key={feed.id}
                className={`p-4 border rounded-lg transition-all ${
                  feed.active
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 truncate">
                      {feed.name}
                    </h3>
                    <p className="text-gray-600 text-sm truncate mt-1">
                      {feed.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFeed(feed.id)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title={feed.active ? 'Hide feed' : 'Show feed'}
                    >
                      {
                        feed.loading 
                          ? <Loader className="animate-spin w-4 h-4" />
                          : feed.active ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )
                      }
                    </button>
                    {/* <button
                      onClick={() => onRemoveFeed(feed.id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
                      title="Remove feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button> */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
