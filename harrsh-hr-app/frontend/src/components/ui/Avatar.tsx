import clsx from 'clsx';
import { getInitials } from '../../utils/formatters';

const colorPalette = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
];

const getColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

const sizes: Record<string, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  src?: string;
  size?: string;
  className?: string;
}

const Avatar = ({ firstName = '', lastName = '', src, size = 'md', className = '' }: AvatarProps) => {
  const initials = getInitials(firstName, lastName);
  const bgColor = getColor(firstName + lastName);

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={clsx('rounded-full object-cover flex-shrink-0', sizes[size], className)}
      />
    );
  }

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
      bgColor, sizes[size], className
    )}>
      {initials}
    </div>
  );
};

export default Avatar;
