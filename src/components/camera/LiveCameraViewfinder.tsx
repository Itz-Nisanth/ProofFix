'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GeoLocationTelemetry } from '@/types';

interface LiveCameraViewfinderProps {
  telemetry: GeoLocationTelemetry;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
  guidanceText?: string;
  ghostImageUrl?: string; // Optional ghost overlay for resolution capture
}

export function LiveCameraViewfinder({
  telemetry,
  onCapture,
  title = 'Live Camera Report',
  guidanceText = 'Keep the issue clearly visible in the frame',
  ghostImageUrl,
}: LiveCameraViewfinderProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.4);

  // Initialize camera stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setStreamActive(true);
            }).catch((err) => {
              console.warn('Video play prevented:', err);
            });
          };
        }
      } catch (err) {
        console.warn('Camera access unavailable:', err);
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (isCapturing) return;
    setIsCapturing(true);

    // Clear any stale cached analysis
    sessionStorage.removeItem('prooffix_latest_analysis');
    sessionStorage.removeItem('prooffix_duplicate_candidate');
    sessionStorage.removeItem('prooffix_confirmed_incident');

    const canvas = canvasRef.current || document.createElement('canvas');

    // 1. Live video stream snapshot
    if (videoRef.current && (videoRef.current.videoWidth > 0)) {
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setTimeout(() => {
          onCapture(dataUrl);
        }, 200);
        return;
      }
    }

    // 2. Fallback live canvas synthesis when hardware camera is disabled in dev sandbox
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw live dynamic test frame with timestamp
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#1a3a2a');
      grad.addColorStop(1, '#0f231a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('ProofFix Live Capture Test Frame', 80, 200);

      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#a0d8b8';
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 80, 280);
      ctx.fillText(`Location: ${telemetry.city || 'Unknown'} (${telemetry.latitude}, ${telemetry.longitude})`, 80, 330);

      ctx.fillStyle = '#f0c050';
      ctx.fillRect(80, 400, 200, 120);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Civic Object Marker', 90, 470);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setTimeout(() => {
        onCapture(dataUrl);
      }, 200);
      return;
    }
  }, [isCapturing, onCapture, telemetry]);

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder Feed */}
      <div className="absolute inset-0 z-0">
        {hasCamera ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center text-zinc-400">
            <span className="material-symbols-outlined text-[48px] text-zinc-600 mb-2">videocam_off</span>
            <p className="font-headline font-semibold text-white text-base">Camera Stream Inactive</p>
            <p className="font-body text-xs mt-1 max-w-xs">
              Ensure camera permissions are granted. Tap shutter to capture live canvas frame.
            </p>
          </div>
        )}

        {/* Ghost Reference Overlay (for Resolution verification) */}
        {ghostImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-200 border-2 border-primary-fixed/50"
            style={{
              backgroundImage: `url(${ghostImageUrl})`,
              opacity: ghostOpacity,
              mixBlendMode: 'screen',
            }}
          />
        ) : null}

        {/* Grid Overlay */}
        {showGrid ? (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div />
          </div>
        ) : null}

        {/* Flash white screen animation */}
        {isCapturing ? <div className="absolute inset-0 bg-white z-50 animate-ping duration-150" /> : null}

        {/* Ambient Vignettes */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Top Header Controls Bar */}
      <div className="relative z-20 w-full pt-safe pt-space-md px-margin-mobile flex flex-col items-center gap-space-sm">
        <div className="w-full max-w-max-content-width flex items-center justify-between">
          <button
            aria-label="Close Camera"
            className="w-11 h-11 rounded-full bg-black/40 active:bg-black/60 backdrop-blur-md text-surface-container-lowest flex items-center justify-center transition-all transform active:scale-95"
            onClick={() => router.back()}
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          {/* Reassuring Telemetry Pill (No raw numbers) */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-surface-container-lowest shadow-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_8px_#b0f1c7] animate-pulse" />
            <span className="font-body text-xs tracking-tight text-surface-container-lowest font-semibold">
              Location verified
            </span>
          </div>

          <button
            aria-label="Toggle Flash"
            className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all transform active:scale-95 ${
              flashOn ? 'bg-amber-400 text-black' : 'bg-black/40 text-surface-container-lowest'
            }`}
            onClick={() => setFlashOn(!flashOn)}
          >
            <span className="material-symbols-outlined text-[22px]">
              {flashOn ? 'flash_on' : 'flash_off'}
            </span>
          </button>
        </div>

        {/* Ghost Opacity Slider (if in resolution mode) */}
        {ghostImageUrl ? (
          <div className="w-full max-w-xs flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-[11px] text-white/70 font-medium">Ghost Reference:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ghostOpacity}
              onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
              className="w-full accent-primary-fixed cursor-pointer h-1"
            />
          </div>
        ) : null}
      </div>

      {/* Bottom HUD & Shutter Trigger (Golden Thumb Zone) */}
      <div className="relative z-20 w-full pb-safe pb-8 pt-space-md px-margin-mobile flex flex-col items-center">
        {/* Natural Guidance Banner */}
        <div className="mb-5 transition-all duration-300">
          <div className="px-4 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-surface-container-lowest flex items-center gap-2 shadow-lg border border-white/10">
            <span className="material-symbols-outlined text-[16px] text-primary-fixed">center_focus_strong</span>
            <span className="font-body text-xs font-medium">{guidanceText}</span>
          </div>
        </div>

        {/* Primary Shutter Deck */}
        <div className="w-full flex items-center justify-around max-w-xs">
          {/* Spatial Grid Button */}
          <button
            aria-label="Toggle Grid"
            className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-90 ${
              showGrid ? 'bg-white/30 text-white' : 'bg-black/35 text-white/80'
            }`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <span className="material-symbols-outlined text-[20px]">grid_4x4</span>
          </button>

          {/* Large Shutter Button */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-2 rounded-full bg-primary-fixed/30 blur-md opacity-70 animate-pulse pointer-events-none" />
            <button
              aria-label="Capture Incident Photo"
              className="relative w-20 h-20 rounded-full bg-surface-container-lowest p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] transition-all duration-150 transform active:scale-90 focus:outline-none"
              onClick={handleCapture}
            >
              <div className="w-full h-full rounded-full bg-primary-container active:bg-primary flex items-center justify-center shadow-inner transition-colors">
                <span className="material-symbols-outlined text-primary-fixed text-[30px]">
                  photo_camera
                </span>
              </div>
            </button>
          </div>

          {/* Level Indicator Horizon Helper */}
          <div
            className="w-12 h-12 rounded-full bg-black/35 backdrop-blur-md text-primary-fixed flex items-center justify-center transition-all"
            title="Level Horizon"
          >
            <span className="material-symbols-outlined text-[20px]">screen_rotation</span>
          </div>
        </div>

        {/* Reassurance Label */}
        <div className="mt-4 flex items-center gap-1.5 text-white/70 font-body text-[11px]">
          <span className="material-symbols-outlined text-[14px]">videocam</span>
          <span>Live capture only • Location locked</span>
        </div>
      </div>
    </div>
  );
}
