import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Feed, Dataset, Pipeline, Profile } from "../util/types";
import type { AlignmentArtifact } from "../types/dcat-types";
import { getFeed } from "../util/util";
import { loadDcatApMembers, loadPipelineMembers } from "../util/load";
import { loadCatalog } from "../util/catalogLoaders/catalogLoader";
import { loadLdesCatalog } from "../util/catalogLoaders/ldesCatalogLoader";
import extractDatasetsFromCatalog from "../util/catalogLoaders/extractDatasetsFromCatalog";
import extractProfilesFromCatalog from "../util/catalogLoaders/extractProfilesFromCatalog";
import extractAlignmentsFromCatalog from "../util/catalogLoaders/extractAlignmentsFromCatalog";

type State = {
  feeds: Feed[];
  datasets: Dataset[];
  pipelines: Pipeline[];
  profiles: Profile[];
  selectedFeedId?: string | null;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  alignments: AlignmentArtifact[];
};

const initialState: State = {
  feeds: [],
  datasets: [],
  pipelines: [],
  profiles: [],
  alignments: [],
  selectedFeedId: null,
  loading: {},
  errors: {},
};

type Action =
  | { type: "ADD_FEED"; feed: Feed }
  | { type: "SET_FEED_LOADING"; id: string; loading: boolean }
  | { type: "ADD_DATASETS"; datasets: Dataset[] }
  | { type: "ADD_PIPELINES"; pipelines: Pipeline[] }
  | { type: "SET_PROFILES"; profiles: Profile[] }
  | { type: "SELECT_FEED"; id: string | null }
  | { type: "SET_ERROR"; id: string; message: string }
  | { type: "CLEAR" }
  | { type: "REMOVE_PIPELINE"; id: string }
  | { type: "SET_PIPELINES"; pipelines: Pipeline[] }
  | { type: "ADD_ALIGNMENTS"; alignments: AlignmentArtifact[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_FEED": {
      const exists = state.feeds.find((f) => f.id === action.feed.id || f.url === action.feed.url);
      if (exists) return { ...state, feeds: state.feeds.map(f => f.id === action.feed.id ? { ...f, ...action.feed } : f) };
      return { ...state, feeds: state.feeds.concat(action.feed) };
    }
    case "SET_FEED_LOADING": {
      return { ...state, loading: { ...state.loading, [action.id]: action.loading } };
    }
    case "ADD_DATASETS": {
      const merged = state.datasets.concat(action.datasets).filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return { ...state, datasets: merged };
    }
    case "ADD_PIPELINES": {
      const merged = state.pipelines.concat(action.pipelines).filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return { ...state, pipelines: merged };
    }
    case "REMOVE_PIPELINE": {
      return { ...state, pipelines: state.pipelines.filter(p => p.id !== action.id) };
    }
    case "SET_PIPELINES": {
      return { ...state, pipelines: action.pipelines };
    }
    case "ADD_ALIGNMENTS": {
      const merged = state.alignments.concat(action.alignments).filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return { ...state, alignments: merged };
    }
    case "SET_PROFILES": {
      const merged = state.profiles.concat(action.profiles).filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      return { ...state, profiles: merged };
    }
    case "SELECT_FEED": {
      return { ...state, selectedFeedId: action.id };
    }
    case "SET_ERROR": {
      return { ...state, errors: { ...state.errors, [action.id]: action.message } };
    }
    case "CLEAR": {
      return initialState;
    }
    default:
      return state;
  }
}

const FeedStateContext = createContext<State | undefined>(undefined);
const FeedDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

export const FeedProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <FeedStateContext.Provider value={state}>
      <FeedDispatchContext.Provider value={dispatch}>{children}</FeedDispatchContext.Provider>
    </FeedStateContext.Provider>
  );
};

export function useFeedState() {
  const ctx = useContext(FeedStateContext);
  if (!ctx) throw new Error("useFeedState must be used within FeedProvider");
  return ctx;
}

export function useFeedDispatch() {
  const ctx = useContext(FeedDispatchContext);
  if (!ctx) throw new Error("useFeedDispatch must be used within FeedProvider");
  return ctx;
}

// Convenience hook: actions that interact with util loaders
export function useFeedActions() {
  const state = useFeedState();
  const dispatch = useFeedDispatch();

  const loadDcatFeed = useCallback(async (url: string) => {
    // Prefer the new dataset loader which decides between LDES and DCAT
    return loadDatasetFeed(url);
  }, [dispatch]);

  const loadDatasetFeed = useCallback(async (url: string) => {
    try {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: true });
      const feed = await getFeed(url);
      if (!feed) {
        dispatch({ type: "SET_ERROR", id: url, message: "No feed found" });
        dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
        return;
      }
      dispatch({ type: "ADD_FEED", feed });

      // Decide between LDES materialization or normal DCAT catalog
      let catalog: any = null;
      if (feed.isLdesFeed) {
        catalog = await loadLdesCatalog(url, (p) => {
          /* progress callback currently unused; could dispatch progress */
        });
      } else {
        catalog = await loadCatalog(url);
      }

      const datasets = await extractDatasetsFromCatalog(catalog);
      if (datasets && datasets.length) dispatch({ type: "ADD_DATASETS", datasets });

      const profiles = await extractProfilesFromCatalog(catalog);
      if (profiles && profiles.length) dispatch({ type: "SET_PROFILES", profiles });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", id: url, message: e?.message ?? String(e) });
    } finally {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
    }
  }, [dispatch]);

  const loadProfileFeed = useCallback(async (url: string) => {
    try {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: true });
      const feed = await getFeed(url);
      if (!feed) {
        dispatch({ type: "SET_ERROR", id: url, message: "No feed found" });
        dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
        return;
      }
      dispatch({ type: "ADD_FEED", feed });

      const catalog = await loadCatalog(url);
      const profiles = await extractProfilesFromCatalog(catalog);
      if (profiles && profiles.length) dispatch({ type: "SET_PROFILES", profiles });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", id: url, message: e?.message ?? String(e) });
    } finally {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
    }
  }, [dispatch]);

  const loadAlignmentFeed = useCallback(async (url: string) => {
    try {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: true });
      const feed = await getFeed(url);
      if (!feed) {
        dispatch({ type: "SET_ERROR", id: url, message: "No feed found" });
        dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
        return;
      }
      dispatch({ type: "ADD_FEED", feed });

      const catalog = await loadCatalog(url);
      const alignments = await extractAlignmentsFromCatalog(catalog);
      if (alignments && alignments.length) dispatch({ type: "ADD_ALIGNMENTS", alignments });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", id: url, message: e?.message ?? String(e) });
    } finally {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
    }
  }, [dispatch]);

  const loadPipelineFeed = useCallback(async (url: string) => {
    try {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: true });
      const feed = await getFeed(url);
      if (!feed) {
        dispatch({ type: "SET_ERROR", id: url, message: "No feed found" });
        dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
        return;
      }
      dispatch({ type: "ADD_FEED", feed });

      const newPipelines: Pipeline[] = [];
      for await (const p of loadPipelineMembers(feed)) {
        newPipelines.push(p as Pipeline);
      }
      if (newPipelines.length) dispatch({ type: "ADD_PIPELINES", pipelines: newPipelines });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", id: url, message: e?.message ?? String(e) });
    } finally {
      dispatch({ type: "SET_FEED_LOADING", id: url, loading: false });
    }
  }, [dispatch]);

  const selectFeed = useCallback((id: string | null) => dispatch({ type: "SELECT_FEED", id }), [dispatch]);

  return {
    loadDcatFeed,
    loadDatasetFeed,
    loadProfileFeed,
    loadAlignmentFeed,
    loadPipelineFeed,
    selectFeed,
    state,
  };
}

export default FeedProvider;
