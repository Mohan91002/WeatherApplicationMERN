import { useState } from 'react';
import type { RegionWeather } from '../types/regionWeather';
import { useMapFocus } from '../state/MapFocusContext';
import { t } from '../i18n/strings';
import { aqiColor, iconForWeatherCode, skyCover, temperatureColor, timeZoneLabel } from '../shared/weatherVisuals';
import './RegionCard.scss';

interface RegionCardProps {
  region: RegionWeather;
  favorite: boolean;
  pinned: boolean;
  /** Shared wall-clock timestamp (ms) that drives the local-time display. */
  now: number;
  onFavoriteToggle: (country: string) => void;
}

/**
 * One country plotted as a station model: a station tag and coordinates, a
 * sky-cover disc, and monospace TEMP / AIR / FX readouts.
 */
export function RegionCard({ region, favorite, pinned, now, onFavoriteToggle }: RegionCardProps) {
  const { focusOn } = useMapFocus();
  // Set to true when the flag image fails to load, so the emoji is shown instead.
  const [flagFailed, setFlagFailed] = useState(false);

  const icon = iconForWeatherCode(region.weatherCode);
  const aqiDot = aqiColor(region.aqi);
  const tempColor = temperatureColor(region.temperatureC);
  const cover = skyCover(region.weatherCode);
  const hasReading = region.weatherCode >= 0;
  const flagUrl = `https://flagcdn.com/w160/${region.code}.png`;
  const localTime = formatLocalTime(region.timeZone, now);
  const zone = timeZoneLabel(region.timeZone, new Date(now));
  const stationId = region.code.toUpperCase();
  const coords = `${formatCoord(region.latitude, 'N', 'S')} ${formatCoord(region.longitude, 'E', 'W')}`;
  const established = region.establishedYear > 0 ? String(region.establishedYear) : '—';

  const currencyAvailable = region.currencyRate >= 0;
  const rateText = currencyAvailable ? formatRate(region.currencyRate) : '';

  // Pan the background map to this location when the card is hovered/focused.
  const onHover = () => focusOn(region.latitude, region.longitude, region.capital);

  const favTitle = pinned ? 'Pinned first' : favorite ? 'Remove favourite' : 'Add favourite';
  const favAria = (pinned ? 'Pinned ' : favorite ? 'Unfavourite ' : 'Favourite ') + region.country;

  return (
    <article
      className={`stn${pinned ? ' stn--pinned' : ''}${favorite ? ' stn--fav' : ''}`}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <header className="stn__head">
        <span className="stn__id">{stationId}</span>
        <span className="stn__coords">{coords}</span>
        <button
          type="button"
          className={`stn__fav${favorite || pinned ? ' stn__fav--on' : ''}`}
          disabled={pinned}
          title={favTitle}
          aria-label={favAria}
          onClick={() => onFavoriteToggle(region.country)}
        >
          {pinned ? '📌' : favorite ? '★' : '☆'}
        </button>
      </header>

      <div className="stn__ident">
        {flagFailed ? (
          <span className="stn__flag">{region.flag}</span>
        ) : (
          <img
            className="stn__flag-img"
            src={flagUrl}
            alt={`${region.country} flag`}
            loading="lazy"
            onError={() => setFlagFailed(true)}
          />
        )}
        <div className="stn__names">
          <p className="stn__country">{region.country}</p>
          <p className="stn__capital">{region.capital}</p>
        </div>
      </div>

      <div className="stn__meta">
        <span className="stn__est" title="Year founded">
          {t('est')} {established}
        </span>
        <span className="stn__time">
          <span className="stn__clock">◷ {localTime}</span>
          <span className="stn__zone">{zone}</span>
        </span>
      </div>

      <div className="stn__sky">
        <span
          className="stn__cover"
          style={{ ['--cover' as string]: cover, ['--cover-color' as string]: tempColor }}
          aria-hidden="true"
        />
        <span className="stn__glyph">{hasReading ? icon : '·'}</span>
        <span className="stn__conditions">{region.summary}</span>
      </div>

      <dl className="stn__readouts">
        {region.officialLanguage && (
          <div className="stn__row">
            <dt>{t('lang')}</dt>
            <dd className="stn__lang">{region.officialLanguage}</dd>
          </div>
        )}
        <div className="stn__row">
          <dt>{t('temp')}</dt>
          <dd className="stn__temp" style={{ color: tempColor }}>
            {hasReading ? (
              <>
                {region.temperatureC}°C <span className="stn__temp-f">/ {region.temperatureF}°F</span>
              </>
            ) : (
              <span className="stn__na">{t('noReport')}</span>
            )}
          </dd>
        </div>
        <div className="stn__row">
          <dt>{t('air')}</dt>
          <dd className="stn__air">
            <span className="stn__dot" style={{ background: aqiDot }} />
            {t('aqi')} {region.aqi >= 0 ? region.aqi : '—'}
            <span className="stn__air-label">{region.aqiCategory}</span>
          </dd>
        </div>
        {region.currencyCode && (
          <div className="stn__row">
            <dt>{t('fx')}</dt>
            <dd className="stn__fx" title={`${region.currencyCode} per 1 USD`}>
              <span className="stn__fx-code">{region.currencyCode}</span>
              {currencyAvailable ? (
                <>
                  $1 = {region.currencySymbol}
                  {rateText}
                </>
              ) : (
                <span className="stn__na">{t('rateUnavailable')}</span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function formatCoord(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;
}

/** Formats an exchange rate with thousands separators and adaptive precision. */
function formatRate(rate: number): string {
  const maximumFractionDigits = rate >= 100 ? 0 : rate >= 1 ? 2 : 4;
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(rate);
}

function formatLocalTime(timeZone: string, timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(new Date(timestamp));
  } catch {
    return '--:--';
  }
}
