'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuthSession } from '@/lib/supabase/auth';

import { saveReportTelemetry } from '@/lib/locationState';

export default function LocationCheckPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuthSession();
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const requestLocation = () => {
    if (!user) {
      signInWithGoogle('/report/location');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setErrorMessage('Geolocation is not supported by your browser. Please use a device with GPS support.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 5.0;

        try {
          // Reverse geocode real coordinates
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();

            if (process.env.NODE_ENV !== 'production') {
              console.log('[ProofFix DEV] Acquired GPS Telemetry & Reverse Geocoding:', {
                latitude: lat,
                longitude: lng,
                accuracy,
                resolvedCity: data.city,
                locality: data.locality,
                displayName: data.displayName,
              });
            }

            saveReportTelemetry({
              latitude: lat,
              longitude: lng,
              accuracy,
              city: data.city || 'Unknown',
              locality: data.locality || '',
              address_text: data.displayName || 'Location captured',
              captured_at: new Date().toISOString(),
              is_gps_verified: true,
            });

            setIsLocating(false);
            router.push('/report/camera');
            return;
          }
        } catch (geoErr) {
          console.warn('[Location Geocode Error]:', geoErr);
        }

        // Geocoding fallback: Keep real coordinates, neutral label
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ProofFix DEV] Acquired GPS Telemetry (Geocode neutral fallback):', {
            latitude: lat,
            longitude: lng,
            accuracy,
            resolvedCity: 'Unknown',
            displayName: 'Location captured',
          });
        }

        saveReportTelemetry({
          latitude: lat,
          longitude: lng,
          accuracy,
          city: 'Unknown',
          locality: '',
          address_text: 'Location captured',
          captured_at: new Date().toISOString(),
          is_gps_verified: true,
        });

        setIsLocating(false);
        router.push('/report/camera');
      },
      (error) => {
        console.warn('Geolocation denied or timed out:', error);
        setIsLocating(false);
        setErrorMessage(
          error.code === 1
            ? 'Location permission was denied. Please allow location access to verify and report civic issues.'
            : 'Unable to acquire accurate GPS fix. Please ensure location services are enabled.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Location Check" showBack />

      <main className="flex-1 w-full pt-16 pb-safe flex flex-col justify-between">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Interactive Focal Location Art with Living Ripple Pulses */}
          <div className="relative w-full aspect-[4/3] max-h-72 rounded-2xl overflow-hidden bg-surface-subtle flex items-center justify-center shadow-sm mt-4 border border-surface-variant/30">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-subtle via-transparent to-surface-subtle/80" />

            {/* Living Ripple Pulses */}
            <div className="relative flex items-center justify-center z-10">
              <div
                className="absolute w-44 h-44 rounded-full bg-primary/10 animate-ping"
                style={{ animationDuration: '3.5s' }}
              />
              <div
                className="absolute w-32 h-32 rounded-full bg-primary/15 animate-pulse"
                style={{ animationDuration: '2.2s' }}
              />

              {/* Tactile Pin Container */}
              <div className="relative w-20 h-20 rounded-full bg-surface-card shadow-[0_12px_28px_rgba(15,81,50,0.18)] flex items-center justify-center transform transition-transform duration-300 hover:scale-105">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-inner">
                  <span
                    className="material-symbols-outlined text-[30px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    location_on
                  </span>
                </div>
                {/* Soft Civic Aura Badge */}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed-dim opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-state-resolved shadow-sm" />
                </span>
              </div>
            </div>

            {/* Micro Geographic Precision Pill Overlay */}
            <div className="absolute bottom-space-sm inset-x-space-sm flex justify-center z-10">
              <div className="inline-flex items-center gap-space-xs px-3.5 py-1 rounded-full bg-surface-card/95 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-surface-variant/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-resolved opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-state-resolved" />
                </span>
                <span className="font-body text-xs font-semibold text-on-surface">Location check required</span>
              </div>
            </div>
          </div>

          {/* Editorial Headline & Context */}
          <div className="flex flex-col mt-space-lg text-center items-center">
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">Where is the issue?</h1>
            <p className="font-body text-sm text-on-surface-variant mt-space-xs max-w-md leading-relaxed">
              ProofFix attaches your verified location to live photo evidence so response teams and neighbors know
              precisely where to help.
            </p>
          </div>

          {/* Civic Privacy Guarantee */}
          <div className="flex items-start gap-space-sm p-space-md mt-space-lg rounded-2xl bg-risk-low-subtle text-on-surface border border-risk-low/20">
            <div className="w-9 h-9 rounded-full bg-surface-card flex items-center justify-center shrink-0 shadow-sm text-primary">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-sm font-semibold text-primary">Civic Privacy Guarantee</span>
              <p className="font-body text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                Your location is attached only to this incident evidence. We never track your background location or
                personal movements.
              </p>
            </div>
          </div>

          {/* Realtime Area Context Strip */}
          <div className="flex items-center justify-between p-space-md mt-space-md rounded-2xl bg-surface-card border border-surface-variant/30 shadow-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-9 h-9 rounded-full bg-risk-medium-subtle text-risk-medium flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">location_searching</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body text-[11px] text-on-surface-variant">Incident location</span>
                <span className="font-body text-xs font-semibold text-on-surface truncate">
                  Matches nearby neighborhood reports
                </span>
              </div>
            </div>
            <span className="font-body text-[11px] font-semibold px-2.5 py-1 rounded-full bg-risk-medium-subtle text-risk-medium shrink-0 ml-space-xs">
              Required
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 mt-space-md rounded-xl bg-risk-high-subtle text-risk-high border border-risk-high/30 text-xs">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <p className="font-body leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Decisive Bottom Thumb Zone Actions */}
          <div className="flex flex-col items-center gap-space-sm mt-space-xl">
            <button
              type="button"
              disabled={isLocating}
              onClick={requestLocation}
              className="w-full h-14 rounded-full bg-primary hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-space-xs text-on-primary font-body text-base font-semibold shadow-[0_8px_24px_-2px_rgba(15,81,50,0.28)]"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isLocating ? 'sync' : 'my_location'}
              </span>
              <span>
                {!user
                  ? 'Sign in with Google to report'
                  : isLocating
                  ? 'Verifying location...'
                  : 'Enable location & open camera'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="py-space-xs px-space-sm rounded-full text-on-surface-variant hover:text-on-surface font-body text-xs font-medium transition-colors flex items-center gap-1"
            >
              <span>Why location matters</span>
              <span className="material-symbols-outlined text-[16px]">
                {showExplanation ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {/* Collapsible Educational Sheet */}
          {showExplanation ? (
            <div className="flex flex-col gap-space-xs p-space-md mt-space-sm rounded-2xl bg-surface-container-low border border-surface-variant/30 text-xs text-on-surface-variant leading-relaxed animate-in fade-in duration-200">
              <p className="font-semibold text-on-surface">Why do we require live location?</p>
              <p>
                1. <strong>Prevents Duplicate Reports:</strong> PostGIS instantly identifies if neighbors have already
                reported this issue nearby, consolidating confirmations.
              </p>
              <p>
                2. <strong>Accurate Resolution:</strong> Community volunteers and field teams can navigate directly to the
                hazard without guesswork.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
