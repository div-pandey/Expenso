import React from 'react';

interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

/**
 * Expenso glyph - matches the browser favicon (transit rail / currency tracks)
 * d="M9 10h14M9 16h10M9 22h14M13 6v20"
 */
export const ExpensoGlyph: React.FC<{ className?: string; strokeWidth?: number; color?: string }> = ({
  className = 'w-full h-full',
  strokeWidth = 2.5,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M9 10h14M9 16h10M9 22h14M13 6v20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Expenso Logo: Green rounded square container with the signature white transit track glyph
 */
export const ExpensoLogo: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 rounded-md p-1',
    sm: 'w-7 h-7 rounded-lg p-1',
    md: 'w-8 h-8 rounded-lg p-1.5',
    lg: 'w-10 h-10 rounded-xl p-2',
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-brand-700 text-white flex items-center justify-center shadow-subtle shrink-0 ${className}`}
    >
      <ExpensoGlyph color="white" />
    </div>
  );
};

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  size = 'md',
  showSubtitle = true,
}) => {
  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
  };

  const logoSizes: Record<'sm' | 'md' | 'lg', 'sm' | 'md' | 'lg'> = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  };

  return (
    <div className="flex items-center gap-2.5 select-none">
      <ExpensoLogo size={logoSizes[size]} />
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-black tracking-tight text-charcoal-900 leading-none`}>
          Expenso
        </span>
        {showSubtitle && (
          <span className="text-[11px] text-charcoal-500 font-medium tracking-tight mt-0.5 hidden sm:block">
            Shared Commute Splitter
          </span>
        )}
      </div>
    </div>
  );
};
