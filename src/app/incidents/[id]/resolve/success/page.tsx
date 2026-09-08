'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Incident } from '@/types';

export default function ResolutionVerifiedPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [resolutionImg, setResolutionImg] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);

  useEffect(() => {
    const storedResImg = sessionStorage.getItem('prooffix_resolution_image');
    const storedResData = sessionStorage.getItem('prooffix_resolution_result');
    const storedInc = sessionStorage.getItem('prooffix_resolving_incident');

    if (storedResImg) setResolutionImg(storedResImg);
    if (storedResData) setVerificationData(JSON.parse(storedResData));
    if (storedInc) setIncident(JSON.parse(storedInc));

    if (!storedInc && params.id) {
      fetch(`/api/incidents/${params.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.incident) setIncident(d.incident);
        });
    }
  }, [params.id]);

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <AppHeader subtitle="• Resolution Verified" />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile items-center text-center">
          {/* Celebratory Checkmark Icon */}
          <div className="w-20 h-20 rounded-full bg-state-resolved-subtle flex items-center justify-center mt-6">
            <div className="w-14 h-14 rounded-full bg-state-resolved flex items-center justify-center text-white shadow-lg shadow-state-resolved/30">
              <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          </div>

          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface mt-space-md">
            Resolution Verified
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1.5 max-w-sm leading-relaxed">
            Before and after visual comparison confirms the street is unobstructed and safe.
          </p>

          {/* Side by Side Before / After Cards */}
          <div className="grid grid-cols-2 gap-space-sm mt-space-lg w-full text-left">
            {/* Before */}
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-surface-variant/30 shadow-sm">
                {incident ? (
                  <Image src={incident.primary_image_url} alt="Before" fill className="object-cover" />
                ) : null}
                <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                  Before
                </div>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant truncate">Original hazard report</span>
            </div>

            {/* After */}
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-state-resolved/40 shadow-sm">
                {resolutionImg ? (
                  <Image src={resolutionImg} alt="After" fill className="object-cover" />
                ) : incident ? (
                  <Image
                    src="https://lh3.googleusercontent.com/aida/AEtjO1Whjt3usfmOL_qtGdN54Lv4Ic61zAOHRS2yt_SCQ4wsLmpJwI64EMlmjyYM57HCOrKUqycuyzCQA2-2JHyTeDRXej-KKOUpnvkJ3b0DjucFfFc74xRDa5NBfOrDVCvm4RdYavrNYrubRCBHr3JUK0PlqfxpoLdH87EzipbmA-a2E3ZIeXyRVwnbg2onp2Rc-_TmyqOwCw3EqCyDaDvR2M6Q5A9wBPf-PGxxiMe6QmIlYcIhWqSsqzxonHc"
                    alt="After"
                    fill
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute top-2 left-2 bg-state-resolved px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow">
                  Resolved
                </div>
              </div>
              <span className="text-[11px] font-medium text-state-resolved truncate">Verified restoration</span>
            </div>
          </div>

          {/* Verification Metrics Card */}
          <div className="w-full bg-surface-card rounded-2xl p-space-md mt-space-md border border-surface-variant/30 shadow-sm text-left flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-headline text-xs font-semibold text-primary uppercase tracking-wider">
                Multimodal Verification Evidence
              </span>
              <span className="px-2 py-0.5 rounded-full bg-state-resolved-subtle text-state-resolved font-semibold text-[11px]">
                100% Match
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-state-resolved">check_circle</span>
              <span className="font-medium">Location matches original GPS coordinates</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-state-resolved">check_circle</span>
              <span className="font-medium">Hazard cleared • Street lane fully restored</span>
            </div>

            <p className="font-body text-xs text-on-surface-variant border-t border-surface-variant/20 pt-2 leading-relaxed">
              {verificationData?.comparison?.explanation ||
                'Visual comparison confirms the reported hazard has been resolved and the area is safe.'}
            </p>
          </div>

          {/* Community Impact Card */}
          <div className="w-full p-space-md rounded-2xl bg-surface-canvas border border-surface-variant/20 mt-space-sm flex items-center justify-between text-left">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-xs font-semibold text-on-surface">Community Restored</span>
                <span className="font-body text-xs text-on-surface-variant">Status updated across city map</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="w-full flex flex-col gap-2 mt-space-lg">
            {incident ? (
              <Link
                href={`/incidents/${incident.id}`}
                className="w-full h-14 bg-primary-container hover:bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-md transition-all"
              >
                <span>View Incident Record</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            ) : null}

            <Link
              href="/risks"
              className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center font-body text-sm font-medium transition-colors"
            >
              Explore Other City Risks
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
