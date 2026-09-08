'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { DuplicateEvaluationResult } from '@/types';
import { useAuthSession } from '@/lib/supabase/auth';

export default function DuplicateCandidatePage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuthSession();
  const [duplicateData, setDuplicateData] = useState<DuplicateEvaluationResult | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const storedDup = sessionStorage.getItem('prooffix_duplicate_candidate');
    const storedImg = sessionStorage.getItem('prooffix_captured_image');

    if (!storedDup || !storedImg) {
      router.replace('/report/location');
      return;
    }

    setDuplicateData(JSON.parse(storedDup));
    setUserImage(storedImg);
  }, [router]);

  const handleConfirmExisting = async () => {
    if (!duplicateData || isProcessing) return;

    if (!user) {
      signInWithGoogle('/report/duplicate');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/confirm-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: duplicateData.candidateIncident.id,
          image: userImage,
          capturedAt: new Date().toISOString(),
        }),
      });

      const result = await res.json();
      if (result.incident) {
        sessionStorage.setItem('prooffix_confirmed_incident', JSON.stringify(result.incident));
        sessionStorage.setItem('prooffix_is_confirmation_mode', 'true');
        router.push('/report/success');
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      setIsProcessing(false);
    }
  };

  const handleCreateSeparate = async () => {
    const analysisStored = sessionStorage.getItem('prooffix_latest_analysis');
    const telStored = sessionStorage.getItem('prooffix_current_telemetry');

    if (!analysisStored || !telStored || !userImage) {
      router.push('/report/analyze');
      return;
    }

    if (!user) {
      signInWithGoogle('/report/duplicate');
      return;
    }

    setIsProcessing(true);
    const analysis = JSON.parse(analysisStored);
    const tel = JSON.parse(telStored);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: analysis.title,
          description: analysis.description,
          category: analysis.category,
          severity: analysis.priority_breakdown.severity,
          status: 'open',
          latitude: tel.latitude,
          longitude: tel.longitude,
          location_accuracy: tel.accuracy,
          city: tel.city || 'Unknown',
          address_text: tel.address_text || (tel.city && tel.city !== 'Unknown' ? `${tel.city}, Location verified` : 'Location captured'),
          primary_image_url: userImage,
          captured_at: tel.captured_at,
          ai_observations: analysis.ai_observations,
          priority_breakdown: analysis.priority_breakdown,
          confirmation_count: 1,
        }),
      });

      const result = await res.json();
      if (result.incident) {
        sessionStorage.setItem('prooffix_confirmed_incident', JSON.stringify(result.incident));
        router.push('/report/success');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setIsProcessing(false);
    }
  };

  if (!duplicateData || !userImage) {
    return <div className="min-h-screen bg-surface" />;
  }

  const candidate = duplicateData.candidateIncident;

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Duplicate Check" showBack />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Header Title */}
          <div className="flex flex-col mt-4">
            <div className="flex items-center gap-2 text-amber-700">
              <span className="material-symbols-outlined text-[20px]">content_copy</span>
              <span className="font-headline text-xs font-semibold uppercase tracking-wider">
                Multi-Factor Proximity Match
              </span>
            </div>
            <h1 className="font-headline font-bold text-2xl text-on-surface mt-1">
              Possible existing report nearby
            </h1>
            <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
              We found a report recorded ~{duplicateData.distanceMetres}m away. Confirming this report strengthens civic
              priority without creating duplicate clutter.
            </p>
          </div>

          {/* Side by Side Evidence Comparison */}
          <div className="grid grid-cols-2 gap-space-sm mt-space-md">
            {/* Your Live Capture */}
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-surface-variant/40 shadow-sm">
                <Image src={userImage} alt="Your Live Capture" fill className="object-cover" />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-semibold text-white">
                  Your capture
                </div>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant text-center">Just now</span>
            </div>

            {/* Existing Incident Photo */}
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-surface-variant/40 shadow-sm">
                <Image
                  src={candidate.primary_image_url}
                  alt="Existing Incident Evidence"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-semibold text-white">
                  Existing report
                </div>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant text-center">
                {candidate.confirmation_count} neighbor confirmations
              </span>
            </div>
          </div>

          {/* 4-Stage Weighted Match Card */}
          <div className="mt-space-md p-space-md rounded-2xl bg-surface-card border border-surface-variant/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-headline text-xs font-semibold text-on-surface uppercase tracking-wider">
                Weighted Match Breakdown
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-headline font-bold text-xs">
                {duplicateData.score}% Overall Score
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Location Proximity</span>
                <span className="font-semibold text-on-surface mt-0.5">
                  {duplicateData.proximityScore}/30 pts (~{duplicateData.distanceMetres}m)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Category Similarity</span>
                <span className="font-semibold text-on-surface mt-0.5">{duplicateData.categoryScore}/25 pts</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Visual Match (Gemini)</span>
                <span className="font-semibold text-on-surface mt-0.5">{duplicateData.visualScore}/35 pts</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Time Correlation</span>
                <span className="font-semibold text-on-surface mt-0.5">{duplicateData.timeScore}/10 pts</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant border-t border-surface-variant/20 pt-2 leading-relaxed">
              {duplicateData.explanation}
            </p>
          </div>

          {/* Candidate Incident Summary Card */}
          <div className="mt-space-sm p-space-md rounded-2xl bg-surface-canvas border border-surface-variant/20 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-primary uppercase">Existing Issue Title</span>
            <p className="font-headline font-semibold text-sm text-on-surface">{candidate.title}</p>
            <p className="font-body text-xs text-on-surface-variant">{candidate.address_text}</p>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="flex flex-col gap-2 mt-space-lg">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmExisting}
              className="w-full h-14 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-sm font-semibold shadow-lg shadow-primary-container/20 transition-all"
            >
              <span className="material-symbols-outlined text-[22px]">group_add</span>
              <span>
                {!user
                  ? 'Sign in with Google to confirm'
                  : 'Confirm this existing incident (+1 confirmation)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCreateSeparate}
              className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center font-body text-xs font-medium transition-colors"
            >
              No, submit as separate different issue
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
