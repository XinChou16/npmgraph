import { DEFAULT_NPM_REGISTRY, PARAM_REGISTRY } from './constants.js';
import { getGlobalState } from './GlobalStore.js';
import { searchGet, searchSet } from './url_util.js';
import useLocation, { patchLocation } from './useLocation.js';

const STORAGE_KEY_REGISTRY = 'npm_registry';

export default function useRegistry() {
  const [location] = useLocation();
  const searchRegistry = searchGet(PARAM_REGISTRY, location);
  let registry = searchRegistry;

  // If no registry in URL, check localStorage
  if (!registry) {
    registry = localStorage.getItem(STORAGE_KEY_REGISTRY);
  }

  // Fallback to default
  return [registry ?? DEFAULT_NPM_REGISTRY, setRegistry] as const;
}

function setRegistry(registry: string) {
  if (registry && registry !== DEFAULT_NPM_REGISTRY) {
    localStorage.setItem(STORAGE_KEY_REGISTRY, registry);
  } else {
    localStorage.removeItem(STORAGE_KEY_REGISTRY);
  }

  const search = searchSet(
    PARAM_REGISTRY,
    registry === DEFAULT_NPM_REGISTRY ? '' : registry,
  );
  patchLocation({ search }, true);
}

export function getRegistry() {
  const location = getGlobalState('location');
  const searchRegistry = searchGet(PARAM_REGISTRY, location);

  if (searchRegistry) return searchRegistry;

  // Try localStorage
  const stored = localStorage.getItem(STORAGE_KEY_REGISTRY);

  return stored ?? DEFAULT_NPM_REGISTRY;
}
