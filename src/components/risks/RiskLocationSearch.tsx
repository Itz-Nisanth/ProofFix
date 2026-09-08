'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RiskLocationSelection } from '@/lib/locationState';

interface RiskLocationSearchProps {
  selectedLocation: RiskLocationSelection | null;
  onSelectLocation: (location: RiskLocationSelection | null) => void;
  className?: string;
  isMapOverlay?: boolean;
}

export function RiskLocationSearch({
  selectedLocation,
  onSelectLocation,
  className = '',
  isMapOverlay = false,
}: RiskLocationSearchProps) {
  const [inputValue, setInputValue] = useState<string>(selectedLocation ? selectedLocation.label : '');
  const [suggestions, setSuggestions] = useState<RiskLocationSelection[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external selectedLocation changes
  useEffect(() => {
    if (selectedLocation && selectedLocation.label !== 'All Cities') {
      setInputValue(selectedLocation.label);
    } else {
      setInputValue('');
    }
  }, [selectedLocation]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle typing with 400ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setFetchError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location-search?q=${encodeURIComponent(val.trim())}`);
        if (!res.ok) {
          throw new Error('Search failed');
        }
        const data = await res.json();
        if (data.results) {
          setSuggestions(data.results);
          setIsOpen(true);
        } else if (data.error) {
          setFetchError(data.error);
        }
      } catch (err) {
        console.warn('[RiskLocationSearch Error]:', err);
        setFetchError('Unable to load locations');
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  const handleSelect = (loc: RiskLocationSelection | null) => {
    if (!loc || loc.label === 'All Cities') {
      setInputValue('');
      setSuggestions([]);
      setIsOpen(false);
      onSelectLocation(null);
    } else {
      setInputValue(loc.label);
      setSuggestions([]);
      setIsOpen(false);
      onSelectLocation(loc);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation(null);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Combobox Input Container */}
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-primary pointer-events-none">
          search
        </span>

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 || inputValue.trim().length >= 3) {
              setIsOpen(true);
            }
          }}
          placeholder="Search city or area"
          className={`w-full h-11 pl-10 pr-10 rounded-full font-headline font-semibold text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all ${
            isMapOverlay
              ? 'bg-surface-card/95 backdrop-blur-md border border-surface-variant/40 shadow-lg'
              : 'bg-surface-card border border-surface-variant/40'
          }`}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 flex items-center">
          {isLoading ? (
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant animate-spin">
              progress_activity
            </span>
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-[18px] block">close</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-surface-variant/40 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 ${
            isMapOverlay
              ? 'bg-surface-card/98 backdrop-blur-xl'
              : 'bg-surface-card'
          }`}
        >
          <div className="max-h-64 overflow-y-auto divide-y divide-surface-variant/20">
            {/* Default 'All Cities' Option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-3 text-left font-headline text-sm font-semibold text-primary hover:bg-surface-container flex items-center gap-2.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                public
              </span>
              <span>All Cities &amp; Areas</span>
            </button>

            {/* Suggestions */}
            {suggestions.map((sug, idx) => (
              <button
                key={`${sug.label}-${idx}`}
                type="button"
                onClick={() => handleSelect(sug)}
                className="w-full px-4 py-3 text-left font-headline text-sm text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
                  location_on
                </span>
                <span className="truncate">{sug.label}</span>
              </button>
            ))}

            {/* Error or Empty Message */}
            {fetchError ? (
              <div className="px-4 py-3 text-xs text-risk-critical font-body flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{fetchError}</span>
              </div>
            ) : suggestions.length === 0 && !isLoading && inputValue.trim().length >= 3 ? (
              <div className="px-4 py-3 text-xs text-on-surface-variant font-body">
                No matching locations found in India.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
