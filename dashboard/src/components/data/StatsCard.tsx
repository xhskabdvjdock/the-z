'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '../ui/Card';

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink';
}

const StatsCard = ({ title, value, description, icon, trend, color = 'blue' }: StatsCardProps) => {
  const colors = {
    blue: 'from-discord-blurple/20 to-discord-blurple/5 border-discord-blurple/30',
    green: 'from-discord-green/20 to-discord-green/5 border-discord-green/30',
    yellow: 'from-discord-yellow/20 to-discord-yellow/5 border-discord-yellow/30',
    red: 'from-discord-red/20 to-discord-red/5 border-discord-red/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    pink: 'from-discord-fuchsia/20 to-discord-fuchsia/5 border-discord-fuchsia/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        hover
        className={cn(
          'bg-gradient-to-br',
          colors[color],
          'relative overflow-hidden'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white mb-2">{value}</p>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
            {trend && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-sm',
                trend.isPositive ? 'text-discord-green' : 'text-discord-red'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-white/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
