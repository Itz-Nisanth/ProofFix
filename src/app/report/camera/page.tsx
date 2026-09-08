'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveCameraViewfinder } from '@/components/camera/LiveCameraViewfinder';
import { GeoLocationTelemetry } from '@/types';

export default function CameraPage() {
  const router = useRouter();
  const [telemetry, setTelemetry] = useState<GeoLocationTelemetry | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('prooffix_current_telemetry');
    if (!stored) {
      router.replace('/report/location');
      return;
    }
    try {
      setTelemetry(JSON.parse(stored));
    } catch {
      router.replace('/report/location');
    }
  }, [router]);

  const handleCapture = (imageDataUrl: string) => {
    sessionStorage.setItem('prooffix_captured_image', imageDataUrl);
    router.push('/report/analyze');
  };

  if (!telemetry) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white font-body text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-fixed animate-ping" />
          <span>Securing location lock...</span>
        </div>
      </div>
    );
  }

  return (
    <LiveCameraViewfinder
      telemetry={telemetry}
      onCapture={handleCapture}
      title="Live Camera Report"
      guidanceText="Keep the issue clearly visible in the frame"
    />
  );
}
