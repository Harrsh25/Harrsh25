const NoLeave = ({ className = 'w-32 h-32' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="25" width="80" height="75" rx="8" fill="#EFF4FF" stroke="#1a56db" strokeWidth="2"/>
    <rect x="35" y="15" width="12" height="20" rx="4" fill="#1a56db"/>
    <rect x="73" y="15" width="12" height="20" rx="4" fill="#1a56db"/>
    <rect x="20" y="42" width="80" height="2" fill="#dbeafe"/>
    <rect x="33" y="58" width="16" height="16" rx="4" fill="#dbeafe"/>
    <rect x="57" y="58" width="16" height="16" rx="4" fill="#dbeafe"/>
    <rect x="81" y="58" width="16" height="16" rx="4" fill="#dbeafe"/>
    <rect x="33" y="82" width="16" height="16" rx="4" fill="#dbeafe"/>
    <rect x="57" y="82" width="16" height="16" rx="4" fill="#dbeafe"/>
    <circle cx="88" cy="88" r="16" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
    <path d="M82 88l4 4 8-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
export default NoLeave;
