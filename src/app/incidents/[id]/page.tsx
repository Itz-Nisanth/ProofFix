'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { SafeIncidentImage } from '@/components/ui/SafeIncidentImage';
import { Incident } from '@/types';

export default function IncidentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirming, setConfirming] = useState<boolean>(false);

  useEffect(() => {
    async function loadIncident() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/incidents/${params.id}`);
        const data = await res.json();
        if (data.incident) {
          setIncident(data.incident);
        }
      } catch (err) {
        console.error('Error loading incident:', err);
      } finally {
        setLoading(false);
      }
    }
    loadIncident();
  }, [params.id]);

  const handleQuickConfirm = async () => {
    if (!incident || confirming) return;
    setConfirming(true);

    try {
      const res = await fetch('/api/confirm-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: incident.id,
          latitude: incident.latitude,
          longitude: incident.longitude,
          capturedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.incident) {
        setIncident(data.incident);
      }
    } catch (e) {
      console.error('Failed to confirm:', e);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <AppHeader subtitle="• Incident Evidence" showBack />
        <main className="flex-1 w-full pt-20 px-margin-mobile max-w-max-content-width mx-auto">
          <div className="w-full aspect-[4/3] rounded-2xl bg-surface-container animate-pulse" />
          <div className="w-3/4 h-8 bg-surface-container rounded-lg mt-4 animate-pulse" />
          <div className="w-1/2 h-4 bg-surface-container rounded-lg mt-2 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col min-h-screen bg-surface items-center justify-center p-6 text-center">
        <h1 className="font-headline font-bold text-xl">Incident not found</h1>
        <Link href="/risks" className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm font-semibold">
          Return to Risks Feed
        </Link>
      </div>
    );
  }

  const isResolved = incident.status === 'resolved';

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Incident Evidence" showBack />

      <main className="flex-1 w-full pt-16 pb-28">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Primary Evidence Photo Card */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container mt-4 shadow-md border border-surface-variant/30">
            <SafeIncidentImage
              src={incident.primary_image_url}
              alt={incident.title}
              fallbackCategory={incident.category}
              fill
              className="object-cover"
              priority
            />

            {/* Top Geotag Overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_8px_#b0f1c7]" />
              <span className="font-body text-xs font-semibold">Live Location Evidence</span>
            </div>

            {/* Resolved Status Overlay (if resolved) */}
            {isResolved ? (
              <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-state-resolved text-white font-headline text-xs font-bold shadow-lg">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Verified Resolved</span>
              </div>
            ) : null}
          </div>

          {/* Incident Header Info */}
          <div className="flex flex-col gap-2 mt-space-lg">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isResolved
                    ? 'bg-state-resolved-subtle text-state-resolved'
                    : incident.severity === 'critical'
                    ? 'bg-risk-critical-subtle text-risk-critical'
                    : incident.severity === 'high'
                    ? 'bg-risk-high-subtle text-risk-high'
                    : 'bg-risk-medium-subtle text-risk-medium'
                }`}
              >
                {isResolved ? 'Resolved' : `${incident.severity} Priority`}
              </span>

              <span className="text-xs text-on-surface-variant font-medium">
                {incident.priority_breakdown?.totalScore || 70}/100 Civic Score
              </span>
            </div>

            <h1 className="font-headline font-bold text-2xl text-on-surface leading-tight mt-1">
              {incident.title}
            </h1>

            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Verified Location Card */}
          <div className="mt-space-md p-space-md rounded-2xl bg-surface-card border border-surface-variant/30 shadow-sm flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">location_on</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-headline text-xs font-semibold text-primary uppercase tracking-wider">
                Verified Incident Location
              </span>
              <p className="font-body text-sm font-semibold text-on-surface mt-0.5">{incident.address_text}</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                Location captured with GPS accuracy of ~{incident.location_accuracy}m
              </p>
            </div>
          </div>

          {/* Community Confirmations Strip */}
          <div className="mt-space-sm p-space-md rounded-2xl bg-surface-canvas border border-surface-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-state-resolved shrink-0">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-sm font-semibold text-on-surface">
                  {incident.confirmation_count} {incident.confirmation_count === 1 ? 'Independent Confirmation' : 'Independent Confirmations'}
                </span>
                <span className="font-body text-xs text-on-surface-variant">
                  Verified by nearby residents{incident.city ? ` in ${incident.city}` : ''}
                </span>
              </div>
            </div>

            {!isResolved ? (
              <button
                type="button"
                disabled={confirming}
                onClick={handleQuickConfirm}
                className="px-3.5 py-1.5 rounded-full bg-surface-card hover:bg-surface-container text-primary font-body text-xs font-semibold border border-surface-variant/40 transition-colors shadow-sm"
              >
                {confirming ? 'Confirming...' : '+ Confirm'}
              </button>
            ) : null}
          </div>

          {/* 100-Point Rule Breakdown Summary */}
          {incident.priority_breakdown ? (
            <div className="mt-space-md p-space-md rounded-2xl bg-surface-card border border-surface-variant/30 flex flex-col gap-2">
              <span className="font-headline text-xs font-semibold text-primary uppercase tracking-wider">
                Deterministic Priority Calculation
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant mt-1">
                <div className="p-2 rounded-xl bg-surface-container-low">
                  <span>Human Safety:</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {incident.priority_breakdown.humanSafetyScore}/40 pts
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-low">
                  <span>Env / Health:</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {incident.priority_breakdown.environmentalHealthScore}/25 pts
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-low">
                  <span>Obstruction:</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {incident.priority_breakdown.publicObstructionScore}/15 pts
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-low">
                  <span>Confirmations:</span>
                  <p className="font-semibold text-on-surface mt-0.5">
                    {incident.priority_breakdown.independentConfirmationsScore}/10 pts
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Resolution Action Dock */}
          {!isResolved ? (
            <div className="flex flex-col gap-space-xs mt-space-xl">
              <Link
                href={`/incidents/${incident.id}/resolve`}
                className="w-full h-14 bg-primary-container hover:bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-lg shadow-primary-container/20 transition-all"
              >
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
                <span>Help Resolve This Issue</span>
              </Link>
            </div>
          ) : (
            <div className="mt-space-xl p-space-md rounded-2xl bg-state-resolved-subtle text-state-resolved border border-state-resolved/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px]">verified</span>
              <div>
                <p className="font-headline font-semibold text-sm">Issue Successfully Resolved</p>
                <p className="font-body text-xs mt-0.5 text-state-resolved/90">
                  Evidence verified by community before & after photo comparison.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
