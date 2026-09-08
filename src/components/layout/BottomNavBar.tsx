'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNavBar() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isRisks = pathname.startsWith('/risks');
  const isActivity = pathname.startsWith('/activity');
  const isProfile = pathname.startsWith('/profile');

  // Hide bottom nav on full-screen camera and direct verification flows
  if (
    pathname.includes('/camera') ||
    pathname.includes('/analyze') ||
    pathname.includes('/duplicate')
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_-4px_20px_rgba(25,28,27,0.04)] border-t border-surface-variant/30">
      <div className="flex justify-around items-center h-16 max-w-max-content-width mx-auto px-space-xs relative">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-space-xs transition-colors ${
            isHome ? 'text-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isHome ? "'FILL' 1" : "'FILL' 0" }}
          >
            roofing
          </span>
          <span className="font-body text-[11px] mt-0.5">Home</span>
        </Link>

        {/* Risks */}
        <Link
          href="/risks"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-space-xs transition-colors ${
            isRisks ? 'text-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isRisks ? "'FILL' 1" : "'FILL' 0" }}
          >
            warning_amber
          </span>
          <span className="font-body text-[11px] mt-0.5">Risks</span>
        </Link>

        {/* Center Report Action Pill (Elevated) */}
        <Link
          href="/report/location"
          className="flex flex-col items-center justify-center -mt-6 group min-w-[48px] min-h-[48px]"
        >
          <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-[0_8px_24px_-2px_rgba(15,81,50,0.36)] group-active:scale-95 transition-transform duration-150 ring-4 ring-surface">
            <span className="material-symbols-outlined text-[28px] text-primary-fixed">photo_camera</span>
          </div>
          <span className="font-body text-[11px] font-semibold text-primary-container mt-1">Report</span>
        </Link>

        {/* Activity */}
        <Link
          href="/risks?status=resolved"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-space-xs transition-colors ${
            isActivity ? 'text-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isActivity ? "'FILL' 1" : "'FILL' 0" }}
          >
            history
          </span>
          <span className="font-body text-[11px] mt-0.5">Activity</span>
        </Link>

        {/* Profile */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-space-xs transition-colors ${
            isProfile ? 'text-primary-container font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isProfile ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="font-body text-[11px] mt-0.5">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
