import Button from './Button.jsx';

const EmptyState = ({ icon: Icon, title, subtitle, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    {Icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400" />
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mb-4 max-w-xs">{subtitle}</p>}
    {action && actionLabel && (
      <Button onClick={action} size="sm">{actionLabel}</Button>
    )}
  </div>
);

export default EmptyState;
