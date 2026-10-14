/* eslint-disable react-refresh/only-export-components -- this module intentionally co-locates the provider with its hook. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** A place the background map should pan/zoom to. */
export interface MapFocus {
  readonly lat: number;
  readonly lon: number;
  readonly label: string;
}

interface MapFocusContextValue {
  /** The location the map is focused on, or null for the default world view. */
  readonly focus: MapFocus | null;
  focusOn(lat: number, lon: number, label: string): void;
}

const MapFocusContext = createContext<MapFocusContextValue | null>(null);

/**
 * Shares the currently focused location between the region cards (which set it
 * on hover) and the background world map (which pans/zooms to it). Keeping this
 * in context avoids threading hover events through the component tree — the
 * React counterpart of the original Angular `MapFocusService` signal.
 */
export function MapFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const focusOn = useCallback((lat: number, lon: number, label: string) => {
    setFocus({ lat, lon, label });
  }, []);

  const value = useMemo(() => ({ focus, focusOn }), [focus, focusOn]);

  return <MapFocusContext.Provider value={value}>{children}</MapFocusContext.Provider>;
}

/** Access the shared map focus. Must be used within a {@link MapFocusProvider}. */
export function useMapFocus(): MapFocusContextValue {
  const ctx = useContext(MapFocusContext);
  if (!ctx) {
    throw new Error('useMapFocus must be used within a MapFocusProvider');
  }
  return ctx;
}
