'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = ({ variant = 'primary', size = 'md', className, children, ...props }: BadgeProps) => {
  const variants = {
    primary: 'bg-discord-blurple/20 text-discord-blurple border-discord-blurple/30',
    success: 'bg-discord-green/20 text-discord-green border-discord-green/30',
    warning: 'bg-discord-yellow/20 text-discord-yellow border-discord-yellow/30',
    danger: 'bg-discord-red/20 text-discord-red border-discord-red/30',
    info: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
