import React from 'react';

interface BlendAvatarProps {
  name: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BlendAvatar: React.FC<BlendAvatarProps> = ({
  name,
  icon,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [icon]);

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  }[size];

  const textSize = {
    sm: 'text-[11px] font-bold',
    md: 'text-xs font-bold',
    lg: 'text-base font-black',
    xl: 'text-xl font-black',
  }[size];

  if (icon && !imageError) {
    if (icon.startsWith('data:image') || icon.startsWith('http://') || icon.startsWith('https://')) {
      return (
        <img
          src={icon}
          alt={name}
          onError={() => setImageError(true)}
          className={`${sizeClasses} object-cover shadow-subtle shrink-0 border border-warm-200 ${className}`}
        />
      );
    }
    // Emoji or unicode icon
    return (
      <div
        className={`${sizeClasses} bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0 shadow-subtle select-none ${className}`}
      >
        <span className={size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs'}>
          {icon}
        </span>
      </div>
    );
  }

  // Default Monogram
  const initials = name.trim().substring(0, 2).toUpperCase() || 'BL';
  return (
    <div
      className={`${sizeClasses} bg-brand-700 text-white flex items-center justify-center shrink-0 shadow-subtle font-black tracking-tight ${textSize} ${className}`}
    >
      {initials}
    </div>
  );
};

