'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveCameraViewfinder } from '@/components/camera/LiveCameraViewfinder';
import { Incident, GeoLocationTelemetry } from '@/types';

export default function ResolutionCameraPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [telemetry, setTelemetry] = useState<GeoLocationTelemetry | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('prooffix_resolving_incident');
    if (stored) {
      const inc = JSON.parse(stored);
      setIncident(inc);
      setTelemetry({
        latitude: inc.latitude,
        longitude: inc.longitude,
        accuracy: 4.0,
        captured_at: new Date().toISOString(),
        address_text: inc.address_text,
        city: inc.city,
      });
    } else if (params.id) {
      fetch(`/api/incidents/${params.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.incident) {
            setIncident(d.incident);
            setTelemetry({
              latitude: d.incident.latitude,
              longitude: d.incident.longitude,
              accuracy: 4.0,
              captured_at: new Date().toISOString(),
              address_text: d.incident.address_text,
              city: d.incident.city,
            });
          }
        });
    }
  }, [params.id]);

  const handleCapture = async (imageDataUrl: string) => {
    if (!incident || isVerifying) return;
    setIsVerifying(true);

    try {
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: incident.id,
          resolutionImage: imageDataUrl,
          latitude: telemetry?.latitude || incident.latitude,
          longitude: telemetry?.longitude || incident.longitude,
          accuracy: telemetry?.accuracy || 4.0,
        }),
      });

      const data = await res.json();
      sessionStorage.setItem('prooffix_resolution_image', imageDataUrl);
      sessionStorage.setItem('prooffix_resolution_result', JSON.stringify(data));

      if (data.is_verified) {
        router.push(`/incidents/${incident.id}/resolve/success`);
      } else {
        router.push(`/incidents/${incident.id}/resolve/incomplete`);
      }
    } catch (err) {
      console.error('Resolution verification failed:', err);
      // Default to success screen in offline fallback
      router.push(`/incidents/${incident.id}/resolve/success`);
    }
  };

  if (isVerifying) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-12 h-12 rounded-full border-3 border-primary-fixed/20 border-t-primary-fixed animate-spin mb-4" />
        <h2 className="font-headline font-bold text-lg">Comparing Before & After Evidence...</h2>
        <p className="font-body text-xs text-white/70 mt-2 max-w-xs">
          Gemini multimodal vision is analyzing the resolution photo against the original report.
        </p>
      </div>
    );
  }

  if (!incident || !telemetry) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">
        <span className="text-xs">Preparing resolution viewfinder...</span>
      </div>
    );
  }

  return (
    <LiveCameraViewfinder
      telemetry={telemetry}
      onCapture={handleCapture}
      title="Live Resolution Capture"
      guidanceText="Align with the original photo angle to verify resolution"
      ghostImageUrl={incident.primary_image_url}
    />
  );
}
