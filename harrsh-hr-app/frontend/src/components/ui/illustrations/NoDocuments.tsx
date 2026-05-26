const NoDocuments = ({ className = 'w-32 h-32' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 20h40l20 20v65a5 5 0 01-5 5H35a5 5 0 01-5-5V20z" fill="#EFF4FF" stroke="#1a56db" strokeWidth="2"/>
    <path d="M70 20v20h20" stroke="#1a56db" strokeWidth="2" strokeLinecap="round"/>
    <rect x="42" y="52" width="36" height="3" rx="1.5" fill="#bfdbfe"/>
    <rect x="42" y="63" width="28" height="3" rx="1.5" fill="#bfdbfe"/>
    <rect x="42" y="74" width="32" height="3" rx="1.5" fill="#bfdbfe"/>
    <circle cx="85" cy="90" r="14" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
    <path d="M85 83v8M85 94v2" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
export default NoDocuments;
