'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { SafeIncidentImage } from '@/components/ui/SafeIncidentImage';
import { Incident } from '@/types';

import { getSelectedRiskCity, setSelectedRiskCity } from '@/lib/locationState';

const CITIES = ['All Cities', 'Puducherry', 'Bengaluru', 'Chennai', 'Coimbatore', 'Madurai'];
const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'resolved'];

export default function RisksDiscoveryPage() {
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize selectedRiskCity separately from GPS telemetry
  useEffect(() => {
    const saved = getSelectedRiskCity();
    if (saved && CITIES.includes(saved)) {
      setSelectedCity(saved);
    }
  }, []);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedRiskCity(city);
  };

  useEffect(() => {
    async function fetchRisks() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCity !== 'All Cities') queryParams.append('city', selectedCity);
        if (selectedSeverity === 'resolved') {
          queryParams.append('status', 'resolved');
        } else if (selectedSeverity !== 'all') {
          queryParams.append('severity', selectedSeverity);
        }

        const res = await fetch(`/api/incidents?${queryParams.toString()}`);
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
        }
      } catch (err) {
        console.error('Failed to load risks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRisks();
  }, [selectedCity, selectedSeverity]);

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• City Risks" />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Top City Discovery Bar & View Switcher */}
          <div className="flex items-center justify-between mt-4 gap-2">
            {/* City Selector */}
            <div className="relative flex-1">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full h-11 pl-10 pr-8 rounded-full bg-surface-card border border-surface-variant/40 font-headline font-semibold text-sm text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    📍 {c}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[20px] text-primary pointer-events-none">
                location_city
              </span>
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-[20px] text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>

            {/* List / Map Switcher Button */}
            <Link
              href="/risks/map"
              className="h-11 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-body text-xs font-semibold flex items-center gap-1.5 border border-surface-variant/30 transition-colors shrink-0 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              <span>Map View</span>
            </Link>
          </div>

          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar mt-1">
            {SEVERITY_FILTERS.map((sev) => {
              const isActive = selectedSeverity === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize shrink-0 transition-all ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-card hover:bg-surface-container text-on-surface-variant border border-surface-variant/30'
                  }`}
                >
                  {sev === 'all' ? 'All Risks' : sev}
                </button>
              );
            })}
          </div>

          {/* Incidents Count Header */}
          <div className="flex items-center justify-between mt-2 mb-3">
            <h2 className="font-headline font-semibold text-base text-on-surface">
              {selectedCity === 'All Cities' ? 'All Areas' : selectedCity} Reports ({incidents.length})
            </h2>
            <span className="text-xs text-on-surface-variant font-medium">Prioritized by urgency</span>
          </div>

          {/* Incidents List */}
          <div className="flex flex-col gap-space-md">
            {loading ? (
              <div className="flex flex-col gap-3">
                <div className="w-full h-32 rounded-2xl bg-surface-container animate-pulse" />
                <div className="w-full h-32 rounded-2xl bg-surface-container animate-pulse" />
                <div className="w-full h-32 rounded-2xl bg-surface-container animate-pulse" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-surface-card rounded-2xl border border-surface-variant/30 px-4">
                <span className="material-symbols-outlined text-[44px] text-state-resolved mb-2">
                  verified
                </span>
                <p className="font-headline font-semibold text-base text-on-surface">No reported risks in this area yet.</p>
                <p className="font-body text-xs text-on-surface-variant mt-1">
                  Active civic reports and neighborhood hazard verifications will appear here.
                </p>
              </div>
            ) : (
              incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="w-full bg-surface-card rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all border border-surface-variant/30 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-space-md">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0 relative">
                      <SafeIncidentImage
                        src={incident.primary_image_url}
                        alt={incident.title}
                        fallbackCategory={incident.category}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            incident.status === 'resolved'
                              ? 'bg-state-resolved-subtle text-state-resolved'
                              : incident.severity === 'critical'
                              ? 'bg-risk-critical-subtle text-risk-critical'
                              : incident.severity === 'high'
                              ? 'bg-risk-high-subtle text-risk-high'
                              : incident.severity === 'medium'
                              ? 'bg-risk-medium-subtle text-risk-medium'
                              : 'bg-risk-low-subtle text-risk-low'
                          }`}
                        >
                          {incident.status === 'resolved' ? 'Resolved' : `${incident.severity}`}
                        </span>

                        <span className="text-[11px] text-on-surface-variant font-medium">
                          {incident.priority_breakdown?.totalScore || 75}/100 pts
                        </span>
                      </div>

                      <h3 className="font-headline font-semibold text-base text-on-surface mt-1 line-clamp-2 leading-snug">
                        {incident.title}
                      </h3>

                      <p className="font-body text-xs text-on-surface-variant flex items-center gap-1 mt-1 truncate">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        <span>{incident.address_text}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Meta Strip */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-variant/20 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-state-resolved">group</span>
                      <span>
                        {incident.confirmation_count} {incident.confirmation_count === 1 ? 'confirmation' : 'confirmations'}
                      </span>
                    </span>

                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      <span>View details</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
