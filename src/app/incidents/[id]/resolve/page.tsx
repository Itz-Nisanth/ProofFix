'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { Incident } from '@/types';
import { useAuthSession } from '@/lib/supabase/auth';

export default function HelpResolvePage() {
  const params = useParams();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuthSession();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/incidents/${params.id}`);
        const data = await res.json();
        if (data.incident) {
          setIncident(data.incident);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  const handleStartCapture = () => {
    if (!incident) return;

    if (!user) {
      signInWithGoogle(`/incidents/${incident.id}/resolve`);
      return;
    }

    sessionStorage.setItem('prooffix_resolving_incident', JSON.stringify(incident));
    router.push(`/incidents/${incident.id}/resolve/camera`);
  };

  if (loading || !incident) {
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Help Resolve" showBack />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Header Title */}
          <div className="flex flex-col mt-4">
            <span className="font-headline text-xs font-semibold text-primary uppercase tracking-wider">
              Community Action Flow
            </span>
            <h1 className="font-headline font-bold text-2xl text-on-surface mt-1">Help resolve this issue</h1>
            <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
              Once the issue has been cleared or repaired, capture live photo evidence from the same location to verify
              resolution.
            </p>
          </div>

          {/* Original Incident Reference Card */}
          <div className="mt-space-md p-space-md rounded-2xl bg-surface-card border border-surface-variant/30 shadow-sm flex items-center gap-space-md">
            <div className="w-18 h-18 rounded-xl overflow-hidden bg-surface-container shrink-0 relative w-16 h-16">
              <Image src={incident.primary_image_url} alt={incident.title} fill className="object-cover" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-primary">Original Report</span>
              <h3 className="font-headline font-semibold text-sm text-on-surface truncate">{incident.title}</h3>
              <p className="font-body text-xs text-on-surface-variant truncate">{incident.address_text}</p>
            </div>
          </div>

          {/* Verification Guide Steps */}
          <div className="mt-space-lg flex flex-col gap-space-sm">
            <h2 className="font-headline font-semibold text-base text-on-surface">How resolution verification works</h2>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-canvas border border-surface-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-headline font-bold text-xs shrink-0">
                1
              </div>
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-on-surface">Clear or fix the hazard</span>
                <span className="text-on-surface-variant mt-0.5 leading-relaxed">
                  Safely remove branches, clear debris, or confirm municipal repair.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-canvas border border-surface-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-headline font-bold text-xs shrink-0">
                2
              </div>
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-on-surface">Live camera capture only</span>
                <span className="text-on-surface-variant mt-0.5 leading-relaxed">
                  Use the camera viewfinder with the transparent ghost overlay to match the original angle.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-canvas border border-surface-variant/20">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-headline font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-on-surface">AI before/after verification</span>
                <span className="text-on-surface-variant mt-0.5 leading-relaxed">
                  Gemini compares both photos and verifies the street has been fully restored.
                </span>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="mt-space-md p-space-md rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
            <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">shield</span>
            <p className="leading-relaxed">
              <strong>Safety First:</strong> Never touch live electrical wires, handle dangerous chemical waste, or enter
              unstable structures without qualified municipal professionals.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="mt-space-xl">
            <button
              type="button"
              onClick={handleStartCapture}
              className="w-full h-14 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-lg shadow-primary-container/20 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">photo_camera</span>
              <span>
                {!user
                  ? 'Sign in with Google to resolve'
                  : 'Open Resolution Camera'}
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
