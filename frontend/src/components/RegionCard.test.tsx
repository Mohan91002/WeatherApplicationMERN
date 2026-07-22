import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegionCard } from './RegionCard';
import { MapFocusProvider } from '../state/MapFocusContext';
import type { RegionWeather } from '../types/regionWeather';

const india: RegionWeather = {
  country: 'India',
  capital: 'New Delhi',
  code: 'in',
  flag: '🇮🇳',
  timeZone: 'Asia/Kolkata',
  latitude: 20,
  longitude: 77,
  temperatureC: 31,
  temperatureF: 88,
  weatherCode: 2,
  summary: 'Partly cloudy',
  aqi: 152,
  aqiCategory: 'Unhealthy',
  currencyCode: 'INR',
  currencySymbol: '₹',
  currencyRate: 83.2,
  establishedYear: 1947,
  officialLanguage: 'Hindi, English',
};

const renderCard = (props: Partial<Parameters<typeof RegionCard>[0]> = {}) =>
  render(
    <MapFocusProvider>
      <RegionCard region={india} favorite={false} pinned now={Date.now()} onFavoriteToggle={vi.fn()} {...props} />
    </MapFocusProvider>,
  );

describe('RegionCard', () => {
  it('renders the classified backend values', () => {
    renderCard();
    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('New Delhi')).toBeInTheDocument();
    expect(screen.getByText('IN')).toBeInTheDocument(); // station id
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    expect(screen.getByText(/31°C/)).toBeInTheDocument();
  });

  it('disables the favourite button when pinned', () => {
    renderCard({ pinned: true });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('📌');
  });

  it('emits the country name when the favourite toggle is clicked', () => {
    const onFavoriteToggle = vi.fn();
    renderCard({ pinned: false, onFavoriteToggle });
    fireEvent.click(screen.getByRole('button'));
    expect(onFavoriteToggle).toHaveBeenCalledWith('India');
  });
});
