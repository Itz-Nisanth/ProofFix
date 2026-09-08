'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { SafeIncidentImage } from '@/components/ui/SafeIncidentImage';
import { Incident } from '@/types';
import { useAuthSession } from '@/lib/supabase/auth';
import { getReportTelemetry, sanitizeStaleLocationState } from '@/lib/locationState';

export default function HomePage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuthSession();
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    sanitizeStaleLocationState();
    const telemetry = getReportTelemetry();
    if (telemetry && telemetry.city && telemetry.city !== 'Unknown' && telemetry.is_gps_verified) {
      setUserCity(telemetry.city);
    } else {
      setUserCity(null);
    }

    async function loadFeed() {
      try {
        const res = await fetch('/api/incidents');
        const data = await res.json();
        if (data.incidents) {
          setRecentIncidents(data.incidents);
        }
      } catch (e) {
        console.error('Failed to load incidents', e);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const handleReportClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      signInWithGoogle('/report/location');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Home Feed" />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile pb-space-2xl">
          {/* Hero Typography: Instantly clear in 3 seconds */}
          <div className="flex flex-col mt-space-lg space-y-space-md">
            <h1 className="font-headline font-bold text-3xl sm:text-4xl text-primary tracking-tight leading-tight">
              See a problem.
              <br />
              Prove it.
              <br />
              Help fix it.
            </h1>
            <p className="font-body text-base text-on-surface-variant leading-relaxed pr-space-xs">
              Capture real-world civic issues with verified location photo evidence. ProofFix helps confirm nearby
              reports, prioritizes urgency, and follows issues to resolution.
            </p>
          </div>

          {/* Photographic Touchstone: Human, civic, tactile */}
          <div className="relative w-full rounded-2xl overflow-hidden mt-space-xl shadow-md bg-surface-container aspect-[16/10]">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbjNrnI6zcD27oJCH_cVabxvV0GlBa_fi-coNG6ge-Mh6MofYZ7fGV8FnlH7CIHKLIIGwUKD28KpIOzoIHMbWprTu-H2VeAwip40J2k31t94Fxi6ERe9pmT4CZNtC9FcKXE1aK0vYJNfsBKfSmrzX13Crrh5g4PJ0oppzMAqGLaL1On8uoUMduo3BfwAq9Ma9IxETGhyhEjIIBJsa83qfQzQp_Lm-Q18ACGJztnFCD0uKD2UeuDLnU3w"
              alt="Neighborhood civic restoration"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent flex flex-col justify-end p-space-md text-on-primary">
              <div className="flex items-center gap-space-xs text-primary-fixed">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                <span className="font-body text-xs font-semibold tracking-wider uppercase">Neighborhood Proof</span>
              </div>
              <p className="font-headline text-lg sm:text-xl text-on-primary mt-1 font-semibold">
                Restoration in action, street by street.
              </p>
            </div>
          </div>

          {/* Primary Decisive Actions: Golden Thumb Zone */}
          <div className="flex flex-col space-y-space-sm mt-space-xl">
            {/* Primary CTA: 56px Tall Civic Emerald Capture Button */}
            <Link
              href="/report/location"
              onClick={handleReportClick}
              className="group relative w-full h-14 bg-primary-container hover:bg-primary active:scale-[0.98] transition-all duration-150 rounded-full flex items-center justify-center gap-space-xs text-on-primary shadow-[0_8px_24px_-2px_rgba(15,81,50,0.3)]"
            >
              <span className="material-symbols-outlined text-[24px] text-primary-fixed group-hover:rotate-12 transition-transform duration-200">
                photo_camera
              </span>
              <span className="font-body text-base font-semibold tracking-wide">Report an issue</span>
            </Link>

            {/* Secondary Ghost Action */}
            <Link
              href="/risks"
              className="w-full h-14 bg-surface-container-low hover:bg-surface-container active:scale-[0.98] transition-all duration-150 rounded-full flex items-center justify-center gap-space-xs text-on-surface"
            >
              <span className="font-body text-base font-medium">Explore risks</span>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">arrow_forward</span>
            </Link>
          </div>

          {/* Community Pulse: Live Restorative Activity */}
          <div className="mt-space-2xl pt-space-xs">
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-headline text-xl text-on-surface font-semibold">
                {userCity ? `Happening nearby in ${userCity}` : 'Recent Live Civic Reports'}
              </h2>
              <span className="flex items-center gap-1.5 font-body text-xs text-state-resolved font-medium">
                <span className="w-2 h-2 rounded-full bg-state-resolved animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Feed List */}
            <div className="flex flex-col gap-space-sm">
              {loading ? (
                <div className="w-full h-24 rounded-2xl bg-surface-container animate-pulse" />
              ) : recentIncidents.length > 0 ? (
                recentIncidents.slice(0, 3).map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    className="w-full bg-surface-card rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all border border-surface-variant/30 flex items-start gap-space-md"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative bg-surface-container">
                      <SafeIncidentImage
                        src={incident.primary_image_url}
                        alt={incident.title}
                        fallbackCategory={incident.category}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-space-xs">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                            incident.status === 'resolved'
                              ? 'bg-state-resolved-subtle text-state-resolved'
                              : incident.severity === 'critical'
                              ? 'bg-risk-critical-subtle text-risk-critical'
                              : 'bg-risk-high-subtle text-risk-high'
                          }`}
                        >
                          {incident.status === 'resolved' ? 'Resolved' : incident.severity}
                        </span>
                        <span className="font-body text-xs text-on-surface-variant">• {incident.address_text}</span>
                      </div>

                      <p className="font-headline text-sm font-semibold text-on-surface mt-1 truncate">
                        {incident.title}
                      </p>

                      <p className="font-body text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-state-resolved">group</span>
                        <span>
                          {incident.confirmation_count} verified {incident.confirmation_count === 1 ? 'neighbor' : 'neighbors'}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="w-full py-10 px-4 rounded-2xl bg-surface-card border border-surface-variant/30 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <span className="material-symbols-outlined text-[24px]">verified_user</span>
                  </div>
                  <p className="font-headline font-semibold text-sm text-on-surface">
                    No reported risks in this area yet.
                  </p>
                  <p className="font-body text-xs text-on-surface-variant mt-0.5">
                    Live civic hazard reports submitted with verified photo evidence will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Proof Mechanism Trust Bar */}
          <div className="mt-space-xl p-space-md rounded-2xl bg-surface-canvas flex items-center justify-between border border-surface-variant/20">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-sm font-semibold text-on-surface">Verified Community Evidence</span>
                <span className="font-body text-xs text-on-surface-variant">
                  Live camera captures with neighborhood location verification
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
