'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Incident } from '@/types';

export default function NotFullyResolvedPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [resolutionImg, setResolutionImg] = useState<string | null>(null);

  useEffect(() => {
    const storedResImg = sessionStorage.getItem('prooffix_resolution_image');
    const storedInc = sessionStorage.getItem('prooffix_resolving_incident');

    if (storedResImg) setResolutionImg(storedResImg);
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
      <AppHeader subtitle="• Resolution Incomplete" showBack />

      <main className="flex-1 w-full pt-16 pb-24">
        <div className="flex flex-col w-full max-w-max-content-width mx-auto px-margin-mobile items-center text-center">
          {/* Amber Incomplete Warning Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mt-6">
            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
          </div>

          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface mt-space-md">
            Not Fully Resolved
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1.5 max-w-sm leading-relaxed">
            Visual comparison indicates that significant portions of the hazard still obstruct the street lane.
          </p>

          {/* Side by Side Comparison */}
          <div className="grid grid-cols-2 gap-space-sm mt-space-lg w-full text-left">
            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-surface-variant/30 shadow-sm">
                {incident ? (
                  <Image src={incident.primary_image_url} alt="Before" fill className="object-cover" />
                ) : null}
                <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                  Original
                </div>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant truncate">Reported hazard</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container border border-amber-400 shadow-sm">
                {resolutionImg ? (
                  <Image src={resolutionImg} alt="Partial Progress" fill className="object-cover" />
                ) : (
                  <Image
                    src="https://lh3.googleusercontent.com/aida/AEtjO1XvEFaovTcC4klwvoRBqgp-0xePaLkGXVVD7iqRdnzyCILuOPyBLHh1kRqrR5sNu8ai_7Qk5Uf2Wkl3MJd0aZG0xKhewUxLMzt13dvx9ZiJL6BTNuzF1m8Cmk9W7UbM119aia_cZU6w43PYjQYk779VQwfMknbzdwWhn1Ng6LO0q3ZHDQefFEJqfBaGzog3vrSW3uCPdNJQbNDzystP4Rjg8BkY6hHdI9jflFHTf1Z2AJxPo88xdlhoXEsS"
                    alt="Partial Progress"
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute top-2 left-2 bg-amber-500 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow">
                  Partial
                </div>
              </div>
              <span className="text-[11px] font-medium text-amber-700 truncate">Remaining obstruction</span>
            </div>
          </div>

          {/* AI Analysis Residual Findings */}
          <div className="w-full bg-amber-50 rounded-2xl p-space-md mt-space-md border border-amber-200 text-left flex flex-col gap-2">
            <span className="font-headline text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Residual Observations
            </span>
            <div className="flex items-start gap-2 text-xs text-amber-900">
              <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">info</span>
              <p className="leading-relaxed">
                Some branches have been pruned, but a large heavy log section is still blocking half the road lane and
                preventing standard two-way vehicular passage.
              </p>
            </div>
          </div>

          {/* Decisive Action Buttons */}
          <div className="w-full flex flex-col gap-2 mt-space-xl">
            {incident ? (
              <Link
                href={`/incidents/${incident.id}/resolve/camera`}
                className="w-full h-14 bg-primary-container hover:bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 font-body text-base font-semibold shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                <span>Retake Resolution Photo</span>
              </Link>
            ) : null}

            {incident ? (
              <Link
                href={`/incidents/${incident.id}`}
                className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-full flex items-center justify-center font-body text-sm font-medium transition-colors"
              >
                Return to Incident Details
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
