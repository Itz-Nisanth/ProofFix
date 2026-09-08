'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Incident } from '@/types';

export default function ConfirmationSuccessPage() {
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isConfirmationMode, setIsConfirmationMode] = useState<boolean>(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('prooffix_confirmed_incident');
    const isConf = sessionStorage.getItem('prooffix_is_confirmation_mode') === 'true';
    if (stored) {
      setIncident(JSON.parse(stored));
      setIsConfirmationMode(isConf);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Verified" />

      <main className="flex-1 w-full pt-16 pb-24 flex flex-col justify-center">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile items-center text-center">
          {/* Animated Success Icon */}
          <div className="relative flex items-center justify-center mt-6">
            <div className="w-24 h-24 rounded-full bg-state-resolved-subtle flex items-center justify-center animate-bounce duration-1000">
              <div className="w-16 h-16 rounded-full bg-state-resolved flex items-center justify-center text-white shadow-lg shadow-state-resolved/30">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
            </div>
          </div>

          {/* Success Headline */}
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface mt-space-lg">
            {isConfirmationMode ? 'Report Confirmed' : 'Incident Submitted'}
          </h1>
          <p className="font-body text-sm text-on-surface-variant mt-2 max-w-sm leading-relaxed">
            Live photo evidence and verified location added to community records. Priority has been calculated.
          </p>

          {/* Incident Summary Card */}
          {incident ? (
            <div className="w-full bg-surface-card rounded-2xl p-space-md mt-space-lg border border-surface-variant/30 shadow-sm text-left flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    incident.severity === 'critical'
                      ? 'bg-risk-critical-subtle text-risk-critical'
                      : incident.severity === 'high'
                      ? 'bg-risk-high-subtle text-risk-high'
                      : 'bg-risk-medium-subtle text-risk-medium'
                  }`}
                >
                  {incident.severity} Priority
                </span>

                <span className="flex items-center gap-1 text-xs text-state-resolved font-medium">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Location verified</span>
                </span>
              </div>

              <h2 className="font-headline font-semibold text-base text-on-surface mt-1">{incident.title}</h2>
              <p className="font-body text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                <span>{incident.address_text}</span>
              </p>

              <div className="mt-2 pt-2 border-t border-surface-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Community confirmations:</span>
                <span className="font-headline font-bold text-on-surface">
                  {incident.confirmation_count} {incident.confirmation_count === 1 ? 'verified neighbor' : 'verified neighbors'}
                </span>
              </div>
            </div>
          ) : null}

          {/* Decisive Actions */}
          <div className="w-full flex flex-col gap-2 mt-space-xl">
            {incident ? (
              <Link
                href={`/incidents/${incident.id}`}
                className="w-full h-14 bg-primary-container hover:bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-md transition-all"
              >
                <span>View Incident Evidence</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            ) : null}

            <Link
              href="/"
              className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center font-body text-sm font-medium transition-colors"
            >
              Return to Home Feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
