'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeIncidentImageProps extends Omit<ImageProps, 'onError'> {
  fallbackCategory?: string;
}

export function SafeIncidentImage({
  src,
  alt,
  fallbackCategory,
  className = '',
  ...props
}: SafeIncidentImageProps) {
  const [error, setError] = useState<boolean>(!src);

  if (error || !src) {
    return (
      <div className={`w-full h-full bg-surface-container flex flex-col items-center justify-center text-on-surface-variant p-2 ${className}`}>
        <span className="material-symbols-outlined text-[28px] text-primary/60">photo_camera</span>
        <span className="font-body text-[10px] text-on-surface-variant/70 mt-1 uppercase tracking-wider font-semibold">
          {fallbackCategory ? `${fallbackCategory} Evidence` : 'Civic Evidence'}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt || 'Incident evidence'}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}
