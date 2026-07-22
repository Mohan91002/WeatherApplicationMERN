import { MapFocusProvider } from './state/MapFocusContext';
import { WorldMap } from './components/WorldMap';
import { RegionsPanel } from './components/RegionsPanel';

/**
 * Root component: an interactive world-map backdrop behind the weather board.
 * The map-focus provider lets the region cards drive the map on hover.
 */
export default function App() {
  return (
    <MapFocusProvider>
      <WorldMap />
      <RegionsPanel />
    </MapFocusProvider>
  );
}
