'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/AppHeader';
import { PriorityBreakdown, DuplicateEvaluationResult } from '@/types';

import { supabase } from '@/lib/supabase/client';
import { signInWithGoogle } from '@/lib/supabase/auth';

export default function AnalysisResultPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<{
    title: string;
    description: string;
    category: string;
    source?: 'gemini-live' | 'mock' | 'error';
    ai_observations: any;
    priority_breakdown: PriorityBreakdown;
    duplicate_candidate: DuplicateEvaluationResult | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const PROGRESS_STEPS = [
    'Understanding the scene with Gemini...',
    'Checking nearby reports with PostGIS...',
    'Evaluating deterministic civic priority...',
  ];

  useEffect(() => {
    // Clear any previous stale analysis state from storage & state on mount
    setAnalysisData(null);
    setErrorMessage(null);
    setSubmitError(null);

    const storedImg = sessionStorage.getItem('prooffix_captured_image');
    const storedTel = sessionStorage.getItem('prooffix_current_telemetry');

    if (!storedImg || !storedTel) {
      router.replace('/report/location');
      return;
    }

    setImage(storedImg);
    const parsedTel = JSON.parse(storedTel);
    setTelemetry(parsedTel);

    // Step simulation for progressive feedback
    const timer1 = setTimeout(() => setLoadingStep(1), 700);
    const timer2 = setTimeout(() => setLoadingStep(2), 1400);

    // Trigger backend API
    async function runAnalysis() {
      try {
        const res = await fetch('/api/analyze-incident', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: storedImg,
            latitude: parsedTel.latitude,
            longitude: parsedTel.longitude,
            accuracy: parsedTel.accuracy,
            capturedAt: parsedTel.captured_at,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error || data.source === 'error') {
          setErrorMessage(data.error || 'Unable to analyze this image. Please retry.');
          return;
        }

        if (data.title) {
          setAnalysisData(data);
          sessionStorage.setItem('prooffix_latest_analysis', JSON.stringify(data));
        } else {
          setErrorMessage('Unable to analyze this image. Please retry.');
        }
      } catch (err: any) {
        console.error('Analysis error:', err);
        setErrorMessage('Unable to analyze this image. Please retry.');
      }
    }

    runAnalysis();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [router]);

  const handleConfirmSubmit = async () => {
    if (!analysisData || !image || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Get authenticated Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        setSubmitError('Please sign in with Google in the top bar before submitting your report.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: analysisData.title,
          description: analysisData.description,
          category: analysisData.category,
          severity: analysisData.priority_breakdown.severity,
          status: 'open',
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          location_accuracy: telemetry.accuracy,
          city: telemetry.city || 'Unknown',
          address_text: telemetry.address_text || (telemetry.city && telemetry.city !== 'Unknown' ? `${telemetry.city}, Location verified` : 'Location captured'),
          primary_image_url: image,
          captured_at: telemetry.captured_at,
          ai_observations: analysisData.ai_observations,
          priority_breakdown: analysisData.priority_breakdown,
          confirmation_count: 1,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setSubmitError(result.error || 'Database submission failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (result.incident?.id) {
        sessionStorage.setItem('prooffix_confirmed_incident', JSON.stringify(result.incident));
        router.push('/report/success');
      } else {
        setSubmitError('Failed to verify created incident in database.');
        setIsSubmitting(false);
      }
    } catch (e: any) {
      console.error('Submit error:', e);
      setSubmitError(e.message || 'Network error while submitting report.');
      setIsSubmitting(false);
    }
  };

  const handleGoToDuplicate = () => {
    if (analysisData?.duplicate_candidate) {
      sessionStorage.setItem(
        'prooffix_duplicate_candidate',
        JSON.stringify(analysisData.duplicate_candidate)
      );
      router.push('/report/duplicate');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Scene Analysis" showBack />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Evidence Image Card with Geotag Badge */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container mt-4 shadow-md border border-surface-variant/30">
            {image ? (
              <Image src={image} alt="Live Evidence" fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-high" />
            )}

            {/* Geotag Reassurance Pill */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_8px_#b0f1c7]" />
              <span className="font-body text-xs font-medium">
                Location captured • {telemetry?.city || telemetry?.address_text || 'GPS Verified'}
              </span>
            </div>
          </div>

          {/* Error State */}
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center mt-4 p-6 rounded-2xl bg-red-950/20 border border-red-500/30 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-headline font-semibold text-base text-red-300">
                  {errorMessage}
                </h2>
                <p className="font-body text-xs text-on-surface-variant">
                  We could not process the visual evidence. Please retake a clear photo of the incident.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('prooffix_latest_analysis');
                  router.replace('/report/camera');
                }}
                className="mt-2 h-11 px-6 bg-red-600 hover:bg-red-700 text-white rounded-full font-body text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Retake photo</span>
              </button>
            </div>
          ) : !analysisData ? (
            /* Progressive Loading State */
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
              <p className="font-headline font-medium text-base text-primary animate-pulse">
                {PROGRESS_STEPS[loadingStep] || 'Analyzing evidence...'}
              </p>
              <span className="font-body text-xs text-on-surface-variant">Extracting observations via Gemini Vision</span>
            </div>
          ) : (
            /* Analysis Result Card */
            <div className="flex flex-col gap-space-md mt-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Duplicate Detected Callout Banner (if applicable) */}
              {analysisData.duplicate_candidate?.isCandidate ? (
                <div className="p-space-md rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <span className="material-symbols-outlined text-[20px] text-amber-600">content_copy</span>
                      <span>Possible existing report nearby</span>
                    </div>
                    <span className="text-xs bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                      {analysisData.duplicate_candidate.score}% Match
                    </span>
                  </div>
                  <p className="font-body text-xs text-amber-800 leading-relaxed">
                    A similar incident was reported ~{analysisData.duplicate_candidate.distanceMetres}m away. You can confirm
                    that existing report instead of creating a duplicate.
                  </p>
                  <button
                    onClick={handleGoToDuplicate}
                    className="h-10 mt-1 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-body text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Review duplicate report</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              ) : null}

              {/* Title & Priority Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      analysisData.priority_breakdown.severity === 'critical'
                        ? 'bg-risk-critical-subtle text-risk-critical'
                        : analysisData.priority_breakdown.severity === 'high'
                        ? 'bg-risk-high-subtle text-risk-high'
                        : analysisData.priority_breakdown.severity === 'medium'
                        ? 'bg-risk-medium-subtle text-risk-medium'
                        : 'bg-state-resolved-subtle text-state-resolved'
                    }`}
                  >
                    {analysisData.priority_breakdown.severity} Priority ({analysisData.priority_breakdown.totalScore}/100)
                  </span>

                  <span className="text-xs text-on-surface-variant font-medium">Deterministic Rule Engine</span>
                </div>

                <h1 className="font-headline font-bold text-2xl text-on-surface leading-tight">
                  {analysisData.title}
                </h1>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                  {analysisData.description}
                </p>
              </div>

              {/* Observation Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysisData.ai_observations?.tags?.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-xs font-medium border border-surface-variant/30"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Public Impact & Rule Breakdown */}
              <div className="p-space-md rounded-2xl bg-surface-canvas border border-surface-variant/30 flex flex-col gap-2">
                <span className="font-headline text-xs font-semibold text-primary uppercase tracking-wider">
                  Public Safety & Impact Assessment
                </span>
                <p className="font-body text-xs text-on-surface leading-relaxed">
                  {analysisData.ai_observations?.public_impact ||
                    'Visual assessment complete.'}
                </p>

                <div className="border-t border-surface-variant/20 pt-2 flex flex-col gap-1 text-[11px] text-on-surface-variant">
                  {analysisData.priority_breakdown.reasons.map((r: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Error Banner (if submission fails) */}
              {submitError ? (
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 text-red-300 flex items-center gap-3 animate-in fade-in">
                  <span className="material-symbols-outlined text-[24px] text-red-400 shrink-0">error</span>
                  <div className="flex flex-col text-xs">
                    <span className="font-semibold text-red-200">Submission Error</span>
                    <span className="leading-relaxed">{submitError}</span>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSubmit}
                  className="w-full h-14 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-lg shadow-primary-container/20 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {isSubmitting ? 'hourglass_top' : 'check_circle'}
                  </span>
                  <span>{isSubmitting ? 'Persisting report to Supabase...' : 'Confirm & Submit Incident'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('prooffix_latest_analysis');
                    sessionStorage.removeItem('prooffix_duplicate_candidate');
                    sessionStorage.removeItem('prooffix_confirmed_incident');
                    router.replace('/report/camera');
                  }}
                  className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center font-body text-sm font-medium transition-colors"
                >
                  Retake live photo
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
