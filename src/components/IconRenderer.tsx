import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size = 20 }) => {
  // @ts-ignore
  const IconComponent = LucideIcons[name] || LucideIcons.Folder;
  return <IconComponent className={className} size={size} />;
};

export const AVAILABLE_ICONS = [
  'ShoppingCart',
  'Home',
  'Zap',
  'Car',
  'UtensilsCrossed',
  'HeartPulse',
  'Film',
  'ShoppingBag',
  'CreditCard',
  'GraduationCap',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'Gift',
  'PlusCircle',
  'PiggyBank',
  'Building2',
  'Banknote',
  'Plane',
  'ShieldCheck',
  'Coffee',
  'Wifi',
  'Music',
  'Smartphone',
  'Fuel',
  'Wrench',
  'Dumbbell',
  'Tv',
  'BookOpen',
  'Smile',
];
