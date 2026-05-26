const NoProjects = ({ className = 'w-32 h-32' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="45" width="90" height="60" rx="8" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2"/>
    <path d="M15 60h90" stroke="#e5e7eb" strokeWidth="1.5"/>
    <rect x="28" y="52" width="24" height="6" rx="3" fill="#bfdbfe"/>
    <rect x="28" y="72" width="64" height="4" rx="2" fill="#e5e7eb"/>
    <rect x="28" y="82" width="48" height="4" rx="2" fill="#e5e7eb"/>
    <rect x="28" y="92" width="56" height="4" rx="2" fill="#e5e7eb"/>
    <path d="M45 45V35a15 15 0 0130 0v10" stroke="#1a56db" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
export default NoProjects;
