'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthSession } from '@/lib/supabase/auth';

import { getReportTelemetry, sanitizeStaleLocationState } from '@/lib/locationState';

interface AppHeaderProps {
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
}

export function AppHeader({ subtitle = '• Home Feed', showBack = false, onBack, title }: AppHeaderProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuthSession();
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [userCity, setUserCity] = useState<string | null>(null);

  React.useEffect(() => {
    sanitizeStaleLocationState();
    const telemetry = getReportTelemetry();
    if (telemetry && telemetry.city && telemetry.city !== 'Unknown' && telemetry.is_gps_verified) {
      setUserCity(telemetry.city);
    } else {
      setUserCity(null);
    }
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userFullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Citizen';

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-surface-variant/30">
      <div className="h-16 px-margin-mobile flex items-center justify-between max-w-max-content-width mx-auto">
        <div className="flex items-center gap-space-xs">
          {showBack ? (
            <button
              aria-label="Go Back"
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
              onClick={onBack ? onBack : () => window.history.back()}
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ) : null}

          <Link href="/" className="flex items-center gap-space-xs">
            <Image
              alt="ProofFix Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain rounded-lg"
              src="/logo.svg"
            />
            <span className="font-headline font-semibold text-lg text-on-surface tracking-tight">
              {title || 'ProofFix'}
            </span>
          </Link>

          {subtitle && !title ? (
            <span className="font-body text-xs text-on-surface-variant font-normal hidden xs:inline-block ml-space-xxs">
              {subtitle}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* City Live Indicator (Strictly derived from real browser geolocation) */}
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <span
              className={`w-2 h-2 rounded-full ${
                userCity ? 'bg-state-resolved animate-pulse' : 'bg-on-surface-variant/40'
              }`}
            />
            <span
              className={`font-body text-xs font-medium ${
                userCity ? 'text-state-resolved' : 'text-on-surface-variant'
              }`}
            >
              {userCity || 'Location not set'}
            </span>
          </div>

          {/* Auth State UI */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface-container-high animate-pulse" />
          ) : user ? (
            /* Authenticated: Google Avatar + Dropdown */
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-primary/30 transition-all"
                aria-label="User Account Menu"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-[0_2px_6px_rgba(25,28,27,0.1)] ring-1 ring-surface-variant/40 bg-surface-container-high flex items-center justify-center relative">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={userFullName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                  )}
                </div>
              </button>

              {/* Account Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-surface-card border border-surface-variant/40 shadow-xl z-50 text-xs text-on-surface animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-surface-variant/20">
                    <p className="font-headline font-semibold text-on-surface truncate">{userFullName}</p>
                    <p className="font-body text-on-surface-variant text-[11px] truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 mt-1 rounded-xl text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: Continue with Google Button */
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="h-9 px-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest active:scale-[0.98] border border-surface-variant/40 flex items-center gap-2 text-on-surface text-xs font-semibold shadow-sm transition-all"
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="hidden xs:inline">Continue with Google</span>
              <span className="xs:hidden">Google Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
