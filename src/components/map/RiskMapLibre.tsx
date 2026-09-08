'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Incident } from '@/types';
import Link from 'next/link';
import { SafeIncidentImage } from '@/components/ui/SafeIncidentImage';
import { RiskLocationSelection } from '@/lib/locationState';

interface RiskMapLibreProps {
  incidents: Incident[];
  selectedLocation?: RiskLocationSelection | null;
  onSelectIncident?: (incident: Incident) => void;
}

export function RiskMapLibre({ incidents, selectedLocation, onSelectIncident }: RiskMapLibreProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let initialCenter: [number, number] = [78.9629, 20.5937]; // General India center overview
    let initialZoom = 4.5;

    if (
      selectedLocation &&
      typeof selectedLocation.latitude === 'number' &&
      typeof selectedLocation.longitude === 'number' &&
      (selectedLocation.latitude !== 0 || selectedLocation.longitude !== 0)
    ) {
      initialCenter = [selectedLocation.longitude, selectedLocation.latitude];
      initialZoom = 13.5;
    } else if (incidents.length > 0) {
      initialCenter = [incidents[0].longitude, incidents[0].latitude];
      initialZoom = 12;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initialCenter,
      zoom: initialZoom,
      pitch: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update map center when selectedLocation changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (
      selectedLocation &&
      typeof selectedLocation.latitude === 'number' &&
      typeof selectedLocation.longitude === 'number' &&
      (selectedLocation.latitude !== 0 || selectedLocation.longitude !== 0)
    ) {
      mapRef.current.flyTo({
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 13.5,
        essential: true,
      });
    } else if (incidents.length > 0) {
      // Fit to all incidents bounds
      const bounds = new maplibregl.LngLatBounds();
      incidents.forEach((inc) => bounds.extend([inc.longitude, inc.latitude]));
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [selectedLocation, incidents]);

  // Render Risk Markers from live Supabase coordinates
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-110 active:scale-95 transition-transform';

      // Pin styling based on severity & status
      let bgClass = 'bg-risk-high text-white';
      let icon = 'warning';
      if (inc.status === 'resolved') {
        bgClass = 'bg-state-resolved text-white';
        icon = 'verified';
      } else if (inc.severity === 'critical') {
        bgClass = 'bg-risk-critical text-white';
        icon = 'priority_high';
      } else if (inc.severity === 'high') {
        bgClass = 'bg-risk-high text-white';
        icon = 'warning';
      } else if (inc.severity === 'medium') {
        bgClass = 'bg-risk-medium text-white';
        icon = 'report_problem';
      } else {
        bgClass = 'bg-risk-low text-white';
        icon = 'info';
      }

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 rounded-full ${bgClass} shadow-lg ring-3 ring-white flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-[20px]">${icon}</span>
          </div>
          ${
            inc.severity === 'critical'
              ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span></span>'
              : ''
          }
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedIncident(inc);
        if (onSelectIncident) onSelectIncident(inc);

        mapRef.current?.flyTo({
          center: [inc.longitude, inc.latitude],
          zoom: 15,
          essential: true,
        });
      });

      if (mapRef.current) {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([inc.longitude, inc.latitude])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      }
    });
  }, [incidents, onSelectIncident]);

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-8rem)]">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Selected Incident Drawer */}
      {selectedIncident ? (
        <div className="absolute bottom-20 inset-x-margin-mobile z-40 max-w-max-content-width mx-auto animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="bg-surface-card rounded-2xl p-space-md shadow-2xl border border-surface-variant/40 flex flex-col gap-space-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    selectedIncident.severity === 'critical'
                      ? 'bg-risk-critical-subtle text-risk-critical'
                      : selectedIncident.severity === 'high'
                      ? 'bg-risk-high-subtle text-risk-high'
                      : selectedIncident.severity === 'medium'
                      ? 'bg-risk-medium-subtle text-risk-medium'
                      : 'bg-state-resolved-subtle text-state-resolved'
                  }`}
                >
                  {selectedIncident.severity}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  • {selectedIncident.confirmation_count}{' '}
                  {selectedIncident.confirmation_count === 1 ? 'confirmation' : 'confirmations'}
                </span>
              </div>

              <button
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                onClick={() => setSelectedIncident(null)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container shrink-0 relative">
                <SafeIncidentImage
                  src={selectedIncident.primary_image_url}
                  alt={selectedIncident.title}
                  fallbackCategory={selectedIncident.category}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="font-headline font-semibold text-base text-on-surface truncate">
                  {selectedIncident.title}
                </h3>
                <p className="font-body text-xs text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                  <span>{selectedIncident.address_text}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/incidents/${selectedIncident.id}`}
                className="flex-1 h-11 bg-primary-container hover:bg-primary text-on-primary rounded-full flex items-center justify-center gap-1 font-body text-xs font-semibold transition-colors"
              >
                <span>View evidence</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>

              <Link
                href={`/incidents/${selectedIncident.id}/resolve`}
                className="h-11 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center gap-1 font-body text-xs font-medium transition-colors"
              >
                <span>Help resolve</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
