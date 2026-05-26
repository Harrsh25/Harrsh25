const NoApprovals = ({ className = 'w-32 h-32' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="20" width="70" height="90" rx="8" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2"/>
    <rect x="37" y="38" width="46" height="4" rx="2" fill="#dbeafe"/>
    <rect x="37" y="50" width="36" height="4" rx="2" fill="#e5e7eb"/>
    <rect x="37" y="62" width="40" height="4" rx="2" fill="#e5e7eb"/>
    <circle cx="88" cy="88" r="18" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
    <path d="M81 88l4.5 4.5 9-9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
export default NoApprovals;
