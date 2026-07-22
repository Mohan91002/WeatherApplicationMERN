import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RegionWeather } from '../types/regionWeather';
import { getLiveRegions } from '../api/weatherApi';
import { t } from '../i18n/strings';
import { RegionCard } from './RegionCard';
import './RegionsPanel.scss';

/** Field the country list can be sorted by. */
type SortField = 'country' | 'capital' | 'aqi' | 'year';

/** Country always shown first, regardless of sort field or favourites. */
const PINNED_COUNTRY = 'India';
const FAVORITES_KEY = 'favoriteCountries';
const REFRESH_MS = 60 * 60 * 1000;
const CLOCK_MS = 30 * 1000;
/** How many cards are revealed initially and per scroll step (one full row). */
const PAGE_SIZE = 5;
/** Minimum gap between scroll-triggered loads, so one gesture reveals one batch. */
const SCROLL_COOLDOWN_MS = 500;

const isPinned = (country: string) => country === PINNED_COUNTRY;

/**
 * Shows every country as a card. India is pinned first, then favourites, then
 * the rest sorted by the chosen field. Cards load 5 at a time (one row) as the
 * user scrolls (infinite scroll). Live weather + air quality refresh hourly.
 */
export function RegionsPanel() {
  const [regions, setRegions] = useState<RegionWeather[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [sortField, setSortField] = useState<SortField>('country');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // --- data loading (refresh hourly) ---
  const refreshRegions = useCallback(() => {
    setLoading(true);
    getLiveRegions()
      .then((data) => {
        setRegions(data);
        setHasError(false);
      })
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshRegions();
    const refreshTimer = setInterval(refreshRegions, REFRESH_MS);
    const clockTimer = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => {
      clearInterval(refreshTimer);
      clearInterval(clockTimer);
    };
  }, [refreshRegions]);

  // --- derived, memoised views ---
  /** All regions ordered: India, then favourites, then the rest — by the chosen field. */
  const sortedRegions = useMemo(() => {
    const rank = (region: RegionWeather) => {
      if (isPinned(region.country)) return 0;
      return favorites.has(region.country) ? 1 : 2;
    };
    return [...regions].sort((a, b) => {
      const rankDiff = rank(a) - rank(b);
      return rankDiff !== 0 ? rankDiff : compare(a, b, sortField);
    });
  }, [regions, favorites, sortField]);

  const totalCountries = regions.length;

  /** Regions after the search filter; India is always kept regardless of the query. */
  const filteredRegions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedRegions;
    return sortedRegions.filter((region) => isPinned(region.country) || matchesQuery(region, query));
  }, [sortedRegions, searchQuery]);

  const total = filteredRegions.length;
  const visibleRegions = useMemo(() => filteredRegions.slice(0, visibleCount), [filteredRegions, visibleCount]);
  const allLoaded = visibleCount >= total;

  /** Live world extremes derived from the current readings, shown in the header. */
  const extremes = useMemo(() => {
    const withWeather = regions.filter((r) => r.weatherCode >= 0);
    const withAir = regions.filter((r) => r.aqi >= 0);
    const pick = <T,>(items: T[], better: (a: T, b: T) => boolean): T | null =>
      items.length ? items.reduce((best, item) => (better(item, best) ? item : best)) : null;
    return {
      hottest: pick(withWeather, (a, b) => a.temperatureC > b.temperatureC),
      coldest: pick(withWeather, (a, b) => a.temperatureC < b.temperatureC),
      worstAir: pick(withAir, (a, b) => a.aqi > b.aqi),
    };
  }, [regions]);

  // --- infinite scroll ---
  const loadMore = useCallback(() => {
    setVisibleCount((count) => (count < totalRef.current ? Math.min(count + PAGE_SIZE, totalRef.current) : count));
  }, []);
  const unloadLess = useCallback(() => {
    setVisibleCount((count) => (count > PAGE_SIZE ? Math.max(count - PAGE_SIZE, PAGE_SIZE) : count));
  }, []);

  // Refs mirror the latest values the (once-registered) scroll handler reads.
  const totalRef = useRef(total);
  const visibleCountRef = useRef(visibleCount);
  const allLoadedRef = useRef(allLoaded);
  totalRef.current = total;
  visibleCountRef.current = visibleCount;
  allLoadedRef.current = allLoaded;

  const scrollCooldown = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const startCooldown = () => {
      scrollCooldown.current = true;
      setTimeout(() => {
        scrollCooldown.current = false;
      }, SCROLL_COOLDOWN_MS);
    };

    const onScroll = () => {
      if (scrollCooldown.current) return;
      const doc = document.documentElement;
      const scrollY = window.scrollY;
      const goingDown = scrollY > lastScrollY.current;
      lastScrollY.current = scrollY;

      const distanceFromBottom = doc.scrollHeight - (window.innerHeight + scrollY);

      if (goingDown && !allLoadedRef.current && distanceFromBottom <= 300) {
        // Scrolling down near the end: reveal one more batch.
        loadMore();
        startCooldown();
      } else if (!goingDown && visibleCountRef.current > PAGE_SIZE && distanceFromBottom > 700) {
        // Scrolling back up with the last batch well off-screen: unload it.
        unloadLess();
        startCooldown();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore, unloadLess]);

  // --- handlers ---
  const setSort = (field: SortField) => {
    setSortField(field);
    setVisibleCount(PAGE_SIZE);
  };

  const onSearch = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  const toggleFavorite = (country: string) => {
    if (isPinned(country)) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      saveFavorites(next);
      return next;
    });
  };

  return (
    <section className="regions">
      <header className="regions__head">
        <div className="regions__topbar">
          <p className="regions__eyebrow">
            <span className="regions__live">● {t('live')}</span>
            {t('stationsReporting', { n: totalCountries })}
          </p>
        </div>

        <h1 className="regions__title">
          <svg className="regions__logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1.6" x2="12" y2="4.4" />
              <line x1="12" y1="19.6" x2="12" y2="22.4" />
              <line x1="1.6" y1="12" x2="4.4" y2="12" />
              <line x1="19.6" y1="12" x2="22.4" y2="12" />
              <line x1="4.6" y1="4.6" x2="6.6" y2="6.6" />
              <line x1="17.4" y1="17.4" x2="19.4" y2="19.4" />
              <line x1="4.6" y1="19.4" x2="6.6" y2="17.4" />
              <line x1="17.4" y1="6.6" x2="19.4" y2="4.6" />
            </g>
          </svg>
          <span>{t('boardTitle')}</span>
        </h1>

        <div className="regions__extremes" role="group" aria-label={t('boardTitle')}>
          {extremes.hottest && (
            <span className="ex ex--hot">
              <span className="ex__k">{t('warmest')}</span>
              <span className="ex__v">{extremes.hottest.temperatureC}°C</span>
              <span className="ex__w">{extremes.hottest.capital}</span>
            </span>
          )}
          {extremes.coldest && (
            <span className="ex ex--cold">
              <span className="ex__k">{t('coldest')}</span>
              <span className="ex__v">{extremes.coldest.temperatureC}°C</span>
              <span className="ex__w">{extremes.coldest.capital}</span>
            </span>
          )}
          {extremes.worstAir && (
            <span className="ex ex--air">
              <span className="ex__k">{t('worstAir')}</span>
              <span className="ex__v">
                {t('aqi')} {extremes.worstAir.aqi}
              </span>
              <span className="ex__w">{extremes.worstAir.capital}</span>
            </span>
          )}
        </div>
      </header>

      <div className="regions__controls">
        <div className="regions__sort" role="group" aria-label={t('sort')}>
          <span className="regions__sort-label">{t('sort')}</span>
          {(['country', 'capital', 'aqi', 'year'] as const).map((field) => (
            <button
              key={field}
              type="button"
              className={`regions__sort-btn${sortField === field ? ' regions__sort-btn--active' : ''}`}
              onClick={() => setSort(field)}
            >
              {t(field)}
            </button>
          ))}
        </div>

        <div className="regions__search">
          <label className="regions__search-label" htmlFor="stationSearch" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="10.5" cy="10.5" r="7" />
              <line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
          </label>
          <input
            id="stationSearch"
            type="search"
            className="regions__search-input"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            aria-label={t('find')}
          />
        </div>
      </div>

      {hasError ? (
        <p className="regions__error">{t('loadError')}</p>
      ) : (
        loading && total === 0 && <p className="regions__status">◐ {t('loading')}</p>
      )}

      <div className="regions__grid">
        {visibleRegions.map((region) => (
          <RegionCard
            key={region.country}
            region={region}
            favorite={favorites.has(region.country)}
            pinned={isPinned(region.country)}
            now={now}
            onFavoriteToggle={toggleFavorite}
          />
        ))}
      </div>

      <div className="regions__sentinel">
        {total > 0 &&
          (allLoaded ? (
            <span>✓ {t('allPlotted', { n: total })}</span>
          ) : (
            <span className="regions__count">{t('showing', { v: visibleCount, t: total })}</span>
          ))}
      </div>
    </section>
  );
}

// --- pure helpers ---
function matchesQuery(region: RegionWeather, query: string): boolean {
  return region.country.toLowerCase().includes(query) || region.capital.toLowerCase().includes(query);
}

function compare(a: RegionWeather, b: RegionWeather, field: SortField): number {
  if (field === 'aqi') {
    // Highest AQI (most polluted) first; unavailable readings (-1) sink to the bottom.
    const aqiA = a.aqi < 0 ? Number.NEGATIVE_INFINITY : a.aqi;
    const aqiB = b.aqi < 0 ? Number.NEGATIVE_INFINITY : b.aqi;
    return aqiB - aqiA;
  }
  if (field === 'year') {
    // Oldest founded first; unknown years (0) sink to the bottom.
    const yearA = a.establishedYear > 0 ? a.establishedYear : Number.POSITIVE_INFINITY;
    const yearB = b.establishedYear > 0 ? b.establishedYear : Number.POSITIVE_INFINITY;
    return yearA - yearB;
  }
  const valueA = field === 'capital' ? a.capital : a.country;
  const valueB = field === 'capital' ? b.capital : b.country;
  return valueA.localeCompare(valueB);
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // Ignore storage failures (e.g. private mode); favourites simply won't persist.
  }
}
