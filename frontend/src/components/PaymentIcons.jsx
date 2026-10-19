import React from 'react';

// 1. Google Pay (GPay) Official Vector Emblem
export function GooglePayIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#4285F4"/>
      <path d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13.5 24 13.5c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.5 2 9.9 7.2 6.3 14.7z" fill="#EA4335"/>
      <path d="M24 46c5.4 0 10.3-1.9 14.1-5.1l-6.5-5.3c-2.1 1.4-4.7 2.4-7.6 2.4-6 0-10.7-3.2-12.2-7.8l-6.6 5.1C8.8 41.5 15.8 46 24 46z" fill="#34A853"/>
      <path d="M44.5 20H24v8.5h11.8c-.8 2.5-2.4 4.6-4.6 6l6.5 5.3c4-3.7 6.8-9.3 6.8-15.8 0-1.3-.2-2.7-.5-4z" fill="#FBBC05"/>
    </svg>
  );
}

// 2. PhonePe Official Brand Emblem
export function PhonePeIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#5F259F"/>
      <path d="M25.5 13H18c-.8 0-1.5.7-1.5 1.5v18c0 .8.7 1.5 1.5 1.5h3.5v-7.5h4c4.1 0 7.5-3.4 7.5-7.5s-3.4-6-7.5-6zm0 7.5h-4v-3h4c1.7 0 3 1.3 3 3s-1.3 1.5-3 1.5z" fill="#FFFFFF"/>
      <path d="M31.2 24.8L23.5 35h5.5l5.2-7.2c-.8-.8-1.9-1.9-3-3z" fill="#00D2B5"/>
    </svg>
  );
}

// 3. Paytm UPI Official Brand Emblem
export function PaytmIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="32" rx="6" fill="#002E6E"/>
      <path d="M11 9h4c2.5 0 4.5 1.8 4.5 4.2 0 2.4-2 4.2-4.5 4.2h-2v4.8H11V9zm3.8 5.6c1 0 1.8-.7 1.8-1.4 0-.8-.8-1.4-1.8-1.4H13v2.8h1.8z" fill="#FFFFFF"/>
      <path d="M21 17.4c0-1.6 1.2-2.8 2.8-2.8 1.4 0 2.4.9 2.7 2.1h-5.5zm4.8 2.6c-.6.9-1.5 1.4-2.6 1.4-1.8 0-3.1-1.3-3.1-3.2 0-2 1.3-3.3 3.1-3.3 1.9 0 3 1.4 3 3.4v.5h-4.3c.1.9.8 1.5 1.7 1.5.8 0 1.4-.4 1.7-1l.5 1.2z" fill="#FFFFFF"/>
      <path d="M28.5 10.5h1.8v3.5h1.8v1.4h-1.8v4.2c0 .6.3.8.8.8.3 0 .7-.1.9-.2v1.3c-.3.2-.8.3-1.3.3-1.3 0-2.2-.7-2.2-2.1v-4.4h-1.2v-1.4h1.2v-3.5z" fill="#FFFFFF"/>
      <path d="M33 14h2l1.6 4.9L38.2 14h2l-2.6 7.2c-.7 1.9-1.6 2.5-3 2.5-.4 0-.8-.1-1.1-.2v-1.4c.3.1.6.2.9.2.7 0 1.3-.4 1.6-1.3l.3-.8-3.3-6.2z" fill="#00BAF2"/>
      <path d="M41 14h1.8v1.3c.4-.9 1.3-1.5 2.3-1.5 1.2 0 2 .6 2.4 1.6.5-1 1.4-1.6 2.5-1.6 1.5 0 2.5 1.1 2.5 2.8v5.6h-1.8v-5.2c0-.9-.5-1.5-1.3-1.5-.9 0-1.5.7-1.5 1.7v5h-1.8v-5.2c0-.9-.5-1.5-1.3-1.5-.9 0-1.5.7-1.5 1.7v5H41V14z" fill="#00BAF2"/>
    </svg>
  );
}

// 4. BHIM UPI Official Brand Emblem
export function BhimIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0E2F56"/>
      <path d="M12 36L22 12H27L17 36H12Z" fill="#00A859"/>
      <path d="M22 36L32 12H37L27 36H22Z" fill="#F47920"/>
      <path d="M18 24H30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// 5. UPI Unified Payments Interface Official Emblem
export function UpiIcon({ className = "w-8 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="28" rx="4" fill="#0F172A"/>
      <path d="M10 7l6 14h4l-6-14h-4z" fill="#737373"/>
      <path d="M18 7l6 14h4l-6-14h-4z" fill="#00B050"/>
      <path d="M26 7l6 14h4l-6-14h-4z" fill="#FF6600"/>
      <text x="36" y="19" fill="#FFFFFF" fontFamily="sans-serif" fontSize="12" fontWeight="900" letterSpacing="0.5">UPI</text>
    </svg>
  );
}

// 6. Visa Official Brand Logo
export function VisaIcon({ className = "w-8 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 50 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0"/>
      <path d="M19.2 4.5l-3.2 11.2h-2.5L11 6.8c-.2-.7-.5-.9-1-.9H6.5v.7c1 .3 2.1.6 2.8 1 1 1.2 1.2 1.6 1.4 2.5l2.4 8.7h2.7l4.1-14.3h-2.7z" fill="#1A1F71"/>
      <path d="M24.7 4.5h-2.1c-.6 0-1.1.2-1.3.8L17.5 15.7h2.7l.5-1.5h3.4l.3 1.5h2.4l-2.1-11.2zm-3.5 7.6l1.4-3.9.8 3.9h-2.2z" fill="#1A1F71"/>
      <path d="M30.6 8.3c-.1-.7-.8-1.2-1.7-1.2-1.1 0-1.8.6-1.8 1.4 0 .8.6 1.2 1.8 1.6 1.7.6 2.6 1.5 2.6 2.8 0 1.9-1.6 3.1-3.7 3.1-1.7 0-2.8-.4-3.6-1l.5-2.1c.8.6 1.8.9 2.8.9 1 0 1.6-.5 1.6-1.2 0-.7-.5-1.1-1.6-1.5-1.6-.6-2.6-1.5-2.6-2.7 0-1.8 1.5-3 3.5-3 1.5 0 2.5.3 3.2.7l-.5 2.2z" fill="#1A1F71"/>
      <path d="M38.8 4.5h-2.1l-3.3 11.2h2.6l.6-1.7h3.3l.3 1.7h2.3l-2.1-11.2zm-2.8 7.6l1.4-3.9.8 3.9H36z" fill="#1A1F71"/>
    </svg>
  );
}

// 7. Mastercard Official Brand Emblem
export function MastercardIcon({ className = "w-8 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 50 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#0A0F1D"/>
      <circle cx="21" cy="10" r="6" fill="#EB001B"/>
      <circle cx="29" cy="10" r="6" fill="#F79E1B"/>
      <path d="M25 5.5a6 6 0 000 9 6 6 0 000-9z" fill="#FF5F00"/>
    </svg>
  );
}

// 8. RuPay Official Brand Emblem
export function RupayIcon({ className = "w-8 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 50 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0"/>
      <path d="M10 5h5c2.2 0 3.8 1.4 3.8 3.4 0 1.7-1.1 2.8-2.6 3.2l3 4.4h-3l-2.5-3.8h-1.5v3.8H10V5zm2.2 5.4h2.5c1 0 1.7-.6 1.7-1.5s-.7-1.5-1.7-1.5h-2.5v3z" fill="#092C74"/>
      <path d="M28 5l5 11h-2.5l-1-2.4h-3.8L24.7 16H22l5-11h1zm.6 6.8l-1.3-3.4-1.3 3.4h2.6z" fill="#092C74"/>
      <path d="M37 7l4-2-2 11-4 2 2-11z" fill="#F47920"/>
      <path d="M41 7l4-2-2 11-4 2 2-11z" fill="#00A859"/>
    </svg>
  );
}

// 9. HDFC Bank Official Brand Emblem
export function HdfcIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="6" fill="#004C8F"/>
      <rect x="5" y="5" width="30" height="30" fill="#004C8F"/>
      <rect x="14" y="6" width="12" height="28" fill="#ED232A"/>
      <rect x="6" y="14" width="28" height="12" fill="#ED232A"/>
      <rect x="15" y="15" width="10" height="10" fill="#004C8F"/>
      <rect x="17" y="17" width="6" height="6" fill="#FFFFFF"/>
    </svg>
  );
}

// 10. State Bank of India (SBI) Official Brand Emblem
export function SbiIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#0079C1"/>
      <circle cx="20" cy="20" r="14" fill="#FFFFFF"/>
      <circle cx="20" cy="20" r="9" fill="#0079C1"/>
      <rect x="18" y="20" width="4" height="14" fill="#FFFFFF"/>
    </svg>
  );
}

// 11. ICICI Bank Official Brand Emblem
export function IciciIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F37021"/>
      <circle cx="20" cy="14" r="3" fill="#FFFFFF"/>
      <path d="M14 18h8v14h-4V22h-4v-4z" fill="#053C6D"/>
      <path d="M22 18h5v14h-5V18z" fill="#FFFFFF"/>
    </svg>
  );
}

// 12. Axis Bank Official Brand Emblem
export function AxisIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#97144D"/>
      <path d="M20 7L8 31h8l4-8 4 8h8L20 7z" fill="#FFFFFF"/>
      <path d="M20 18l-3 6h6l-3-6z" fill="#97144D"/>
    </svg>
  );
}

// 13. Kotak Mahindra Bank Official Brand Emblem
export function KotakIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#ED1C24"/>
      <path d="M12 20c0-3.3 2.7-6 6-6s5 3 7 6c2 3 3.7 6 7 6 3.3 0 6-2.7 6-6s-2.7-6-6-6c-3.3 0-5 3-7 6-2 3-3.7 6-7 6-3.3 0-6-2.7-6-6z" stroke="#FFFFFF" strokeWidth="3" fill="none"/>
    </svg>
  );
}

// 14. Punjab National Bank (PNB) Official Brand Emblem
export function PnbIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#A20037"/>
      <circle cx="20" cy="20" r="14" fill="#FDB813"/>
      <circle cx="20" cy="20" r="10" fill="#A20037"/>
      <rect x="18.5" y="14" width="3" height="12" fill="#FFFFFF"/>
    </svg>
  );
}

// 15. Google Social Auth Icon (Official G)
export function GoogleAuthIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

// 16. Apple Social Auth Icon (Official Apple)
export function AppleAuthIcon({ className = "w-5 h-5 text-current" }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.92-14.43-6.53-10.12-11.75-21.78-15.66-34.99-3.92-13.2-5.88-25.29-5.88-36.27 0-14.88 3.81-27.14 11.44-36.78 7.62-9.64 17.15-14.57 28.59-14.79 4.8 0 10.05 1.25 15.76 3.75 5.71 2.5 9.49 3.81 11.34 3.92 1.53 0 5.46-1.42 11.78-4.26 6.32-2.83 11.99-4.14 17.02-3.93 13.06.65 23.51 5.39 31.36 14.21-11.43 6.97-17.02 16.55-16.79 28.74.22 9.58 4.03 17.58 11.44 24 3.69 3.16 8.05 5.45 13.08 6.87-2.62 7.73-6.09 15.78-10.42 24.16zM119.22 33.15c0-7.39 2.65-14.45 7.94-21.19 5.3-6.74 11.88-11.08 19.74-13.03.22 1.08.33 2.17.33 3.26 0 7.39-2.82 14.56-8.47 21.52-5.65 6.96-12.19 11.23-19.61 12.82-.44-1.08-.66-2.17-.66-3.26l.73-.12z"/>
    </svg>
  );
}

// 17. Credit / Debit Card Icon
export function CreditCardTabIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="6" y1="15" x2="10" y2="15"/>
    </svg>
  );
}

// 18. Net Banking Classical Bank Icon
export function NetBankingTabIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 22 7 12 2"/>
      <line x1="4" y1="10" x2="4" y2="17"/>
      <line x1="9" y1="10" x2="9" y2="17"/>
      <line x1="15" y1="10" x2="15" y2="17"/>
      <line x1="20" y1="10" x2="20" y2="17"/>
      <line x1="2" y1="18" x2="22" y2="18"/>
      <line x1="2" y1="21" x2="22" y2="21"/>
    </svg>
  );
}

// Helper to get bank icon component by bank name
export function getBankIcon(bankName) {
  const lower = (bankName || '').toLowerCase();
  if (lower.includes('hdfc')) return <HdfcIcon className="w-5 h-5 shrink-0" />;
  if (lower.includes('sbi') || lower.includes('state bank')) return <SbiIcon className="w-5 h-5 shrink-0" />;
  if (lower.includes('icici')) return <IciciIcon className="w-5 h-5 shrink-0" />;
  if (lower.includes('axis')) return <AxisIcon className="w-5 h-5 shrink-0" />;
  if (lower.includes('kotak')) return <KotakIcon className="w-5 h-5 shrink-0" />;
  if (lower.includes('punjab') || lower.includes('pnb')) return <PnbIcon className="w-5 h-5 shrink-0" />;
  return <NetBankingTabIcon className="w-5 h-5 shrink-0 text-slate-500" />;
}

// Helper to get card brand icon
export function getCardBrandIcon(brand) {
  const lower = (brand || '').toLowerCase();
  if (lower.includes('visa')) return <VisaIcon className="w-7 h-4 shrink-0" />;
  if (lower.includes('master')) return <MastercardIcon className="w-7 h-4 shrink-0" />;
  if (lower.includes('rupay')) return <RupayIcon className="w-7 h-4 shrink-0" />;
  return <CreditCardTabIcon className="w-5 h-5 shrink-0 text-slate-500" />;
}
