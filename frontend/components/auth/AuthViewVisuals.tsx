import React from 'react';

export const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <rect x="2" y="2" width="9" height="9" fill="#F35325" />
    <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
    <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
    <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
  </svg>
);

export const WorkspaceIllustration = () => (
  <svg viewBox="0 0 520 260" className="h-full w-full" role="img" aria-label="Workspace collaboration illustration">
    <defs>
      <linearGradient id="veloAuthBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8edf2" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="520" height="260" rx="28" fill="url(#veloAuthBg)" />
    <rect x="28" y="36" width="464" height="188" rx="16" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="52" y="62" width="184" height="16" rx="8" fill="#cbd5e1" />
    <rect x="52" y="88" width="142" height="12" rx="6" fill="#e2e8f0" />
    <rect x="52" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="188" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="324" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <circle cx="365" cy="154" r="26" fill="#76003f" opacity="0.92" />
    <circle cx="422" cy="154" r="20" fill="#0f172a" opacity="0.9" />
    <circle cx="305" cy="154" r="20" fill="#475569" opacity="0.9" />
  </svg>
);
