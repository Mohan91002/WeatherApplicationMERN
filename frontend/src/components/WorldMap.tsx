import { useEffect, useMemo, useState } from 'react';
import { useMapFocus } from '../state/MapFocusContext';
import { WORLD_LAND_PATH } from './worldMapData';
import './WorldMap.scss';

/** SVG pixel size of the map (2:1 equirectangular). */
const MAP_WIDTH = 1600;
const MAP_HEIGHT = 800;
/** Default world-view centre (lon 10, lat 20) when nothing is hovered. */
const DEFAULT_VIEW = { lon: 10, lat: 20 };
const LON_LINES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const LAT_LINES = [30, 60, 90, 120, 150];

/**
 * Interactive world-map background. The map is an equirectangular land outline
 * (viewBox 0..360 x 0..180). It pans and zooms to whichever country a card is
 * hovered over (via the shared map-focus context); when no card is hovered it
 * holds the default, centred world view. A (design-hidden) marker pins the
 * focused location.
 */
export function WorldMap() {
  const { focus } = useMapFocus();
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Marker position, in map (viewBox) units, for the focused location. */
  const marker = useMemo(() => {
    if (!focus) return null;
    return { x: focus.lon + 180, y: 90 - focus.lat, label: focus.label };
  }, [focus]);

  /**
   * Focus pan/zoom transform (transform-origin: 0 0), eased slowly. Only the
   * hovered card (or the default view) drives this — not the cursor.
   */
  const focusTransform = useMemo(() => {
    const { w, h } = viewport;
    const point = focus ?? DEFAULT_VIEW;

    const pointX = ((point.lon + 180) / 360) * MAP_WIDTH;
    const pointY = ((90 - point.lat) / 180) * MAP_HEIGHT;

    const cover = Math.max(w / MAP_WIDTH, h / MAP_HEIGHT);
    // Zoom in a little when focused so neighbouring countries give context.
    const scale = cover * (focus ? 1.5 : 1.15);

    // Anchor the focused location in the open band near the top of the screen —
    // the card grid fills the centre, so a centred marker would sit behind it.
    // The default (un-hovered) world view stays centred.
    const anchorX = w * 0.5;
    const anchorY = focus ? h * 0.2 : h * 0.5;

    const tx = anchorX - scale * pointX;
    const ty = anchorY - scale * pointY;
    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
  }, [viewport, focus]);

  return (
    <div className="world-map-host" aria-hidden="true">
      <div className="map">
        <div className="map__focus" style={{ transform: focusTransform }}>
          <svg
            className="map__svg"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            viewBox="0 0 360 180"
            preserveAspectRatio="none"
            focusable="false"
          >
            {/* graticule */}
            <g className="map__grid">
              {LON_LINES.map((lon) => (
                <line key={`lon-${lon}`} x1={lon} y1={0} x2={lon} y2={180} />
              ))}
              {LAT_LINES.map((lat) => (
                <line key={`lat-${lat}`} x1={0} y1={lat} x2={360} y2={lat} />
              ))}
            </g>

            {/* land */}
            <path className="map__land" d={WORLD_LAND_PATH} />

            {/* focused-location marker */}
            {marker && (
              <g className="map__marker" transform={`translate(${marker.x} ${marker.y})`}>
                <circle className="map__marker-halo" r={9} />
                <circle className="map__marker-ring" r={4.5} />
                <circle className="map__marker-dot" r={1.8} />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
