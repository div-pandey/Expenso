import React from 'react';
import type { TransportCategory } from '../../types';
import { Car, Zap, Train, Navigation, Bus, Compass } from 'lucide-react';
import { getTransportConfig } from '../../utils/transport';

interface TransportIconProps {
  category: TransportCategory;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TransportIcon: React.FC<TransportIconProps> = ({
  category,
  className = '',
  size = 'md',
}) => {
  const config = getTransportConfig(category);

  const sizeClasses = {
    sm: 'w-7 h-7 p-1.5',
    md: 'w-9 h-9 p-2',
    lg: 'w-11 h-11 p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const renderIcon = () => {
    switch (category) {
      case 'auto':
        return <Car className={iconSizes[size]} />;
      case 'erickshaw':
        return <Zap className={iconSizes[size]} />;
      case 'metro':
        return <Train className={iconSizes[size]} />;
      case 'cab':
        return <Navigation className={iconSizes[size]} />;
      case 'bus':
        return <Bus className={iconSizes[size]} />;
      default:
        return <Compass className={iconSizes[size]} />;
    }
  };

  return (
    <div
      className={`rounded-xl flex items-center justify-center border shrink-0 ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]} ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
