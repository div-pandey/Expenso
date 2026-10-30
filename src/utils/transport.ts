import type { TransportCategory } from '../types';

export interface TransportConfig {
  id: TransportCategory;
  name: string;
  badgeLabel: string;
  quickDescriptions: string[];
  bgClass: string;
  textClass: string;
  borderClass: string;
  iconName: string;
}

export const TRANSPORT_CONFIGS: Record<TransportCategory, TransportConfig> = {
  auto: {
    id: 'auto',
    name: 'Auto-rickshaw',
    badgeLabel: 'Auto',
    quickDescriptions: ['Morning auto to campus', 'Auto from station', 'Rickshaw split', 'Auto to metro'],
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    iconName: 'Car',
  },
  erickshaw: {
    id: 'erickshaw',
    name: 'E-rickshaw',
    badgeLabel: 'E-Rickshaw',
    quickDescriptions: ['E-rickshaw from Gate 3', 'E-rickshaw to hostel', 'Shared e-rickshaw'],
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    iconName: 'Zap',
  },
  metro: {
    id: 'metro',
    name: 'Metro',
    badgeLabel: 'Metro',
    quickDescriptions: ['Metro tickets', 'Metro card recharge', 'Return metro trip'],
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-200',
    iconName: 'Train',
  },
  cab: {
    id: 'cab',
    name: 'Cab / Taxi',
    badgeLabel: 'Cab',
    quickDescriptions: ['Uber ride to college', 'Ola split', 'Rain cab home', 'Late evening cab'],
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-200',
    iconName: 'Navigation',
  },
  bus: {
    id: 'bus',
    name: 'Bus',
    badgeLabel: 'Bus',
    quickDescriptions: ['Campus shuttle', 'DTC bus tickets', 'City bus pass'],
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200',
    iconName: 'Bus',
  },
  other: {
    id: 'other',
    name: 'Other Transport',
    badgeLabel: 'Other',
    quickDescriptions: ['Parking fee', 'Toll plaza split', 'Bike rental split'],
    bgClass: 'bg-stone-50',
    textClass: 'text-stone-700',
    borderClass: 'border-stone-200',
    iconName: 'Compass',
  },
};

export const TRANSPORT_LIST: TransportConfig[] = Object.values(TRANSPORT_CONFIGS);

export function getTransportConfig(category: TransportCategory): TransportConfig {
  return TRANSPORT_CONFIGS[category] || TRANSPORT_CONFIGS.other;
}
