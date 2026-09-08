'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { RiskMapLibre } from '@/components/map/RiskMapLibre';
import { RiskLocationSearch } from '@/components/risks/RiskLocationSearch';
import { Incident } from '@/types';
import {
  RiskLocationSelection,
  getSelectedRiskLocation,
  setSelectedRiskLocation,
} from '@/lib/locationState';

export default function RiskMapPage() {
  const [selectedLocation, setSelectedLocation] = useState<RiskLocationSelection | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize selectedRiskLocation separately from report GPS telemetry
  useEffect(() => {
    const saved = getSelectedRiskLocation();
    if (saved) {
      setSelectedLocation(saved);
    }
  }, []);

  const handleLocationChange = (loc: RiskLocationSelection | null) => {
    setSelectedLocation(loc);
    setSelectedRiskLocation(loc);
  };

  useEffect(() => {
    async function fetchMapIncidents() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedLocation?.city) {
          queryParams.append('city', selectedLocation.city);
        } else if (selectedLocation?.locality) {
          queryParams.append('city', selectedLocation.locality);
        }

        const url = queryParams.toString() ? `/api/incidents?${queryParams.toString()}` : '/api/incidents';
        const res = await fetch(url);
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
        }
      } catch (e) {
        console.error('Failed to load map data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchMapIncidents();
  }, [selectedLocation]);

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface overflow-hidden">
      <AppHeader subtitle="• Risk Map" />

      <main className="flex-1 w-full pt-16 pb-16 relative">
        {/* Floating Top City Bar & View Switcher */}
        <div className="absolute top-20 inset-x-margin-mobile z-40 max-w-max-content-width mx-auto flex items-center justify-between gap-2 pointer-events-auto">
          {/* Autocomplete Location Search */}
          <RiskLocationSearch
            selectedLocation={selectedLocation}
            onSelectLocation={handleLocationChange}
            isMapOverlay={true}
          />

          {/* Switch to List View */}
          <Link
            href="/risks"
            className="h-11 px-4 rounded-full bg-surface-card/95 backdrop-blur-md hover:bg-surface-card text-on-surface font-body text-xs font-semibold flex items-center gap-1.5 border border-surface-variant/40 transition-colors shrink-0 shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            <span>List View</span>
          </Link>
        </div>

        {/* MapLibre Map Canvas */}
        <div className="w-full h-[calc(100vh-8rem)]">
          <RiskMapLibre incidents={incidents} selectedLocation={selectedLocation} />
        </div>

        {/* Empty State Overlay */}
        {!loading && incidents.length === 0 ? (
          <div className="absolute bottom-20 inset-x-margin-mobile z-40 max-w-max-content-width mx-auto">
            <div className="bg-surface-card/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-surface-variant/40 flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-state-resolved">verified</span>
              <div className="flex flex-col">
                <span className="font-headline font-semibold text-sm text-on-surface">
                  No reported risks in this area yet.
                </span>
                <span className="font-body text-xs text-on-surface-variant">
                  Live reports with verified coordinates will appear on this map.
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <BottomNavBar />
    </div>
  );
}
