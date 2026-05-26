const NoData = ({ className = 'w-32 h-32' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="40" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2"/>
    <path d="M40 75c0-11 9-20 20-20s20 9 20 20" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="47" cy="52" r="4" fill="#d1d5db"/>
    <circle cx="73" cy="52" r="4" fill="#d1d5db"/>
  </svg>
);
export default NoData;
