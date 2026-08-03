'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Toggle = ({ checked: controlledChecked, onChange, label, disabled, size = 'md', className }: ToggleProps) => {
  const [internalChecked, setInternalChecked] = useState(false);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const newValue = !checked;
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    onChange?.(newValue);
  };

  const sizes = {
    sm: { width: 'w-8', height: 'h-4', translate: 'translate-x-4' },
    md: { width: 'w-11', height: 'h-6', translate: 'translate-x-5' },
    lg: { width: 'w-14', height: 'h-7', translate: 'translate-x-7' },
  };

  const sizeConfig = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:ring-offset-2',
          sizeConfig.width,
          sizeConfig.height,
          checked ? 'bg-discord-blurple' : 'bg-discord-not-quite-black-hover',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <motion.span
          className="absolute inline-block bg-white rounded-full shadow-lg transform"
          animate={{
            x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 28) : 2,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: size === 'sm' ? '14px' : size === 'md' ? '20px' : '24px',
            height: size === 'sm' ? '14px' : size === 'md' ? '20px' : '24px',
          }}
        />
      </button>
      {label && (
        <label className="text-sm font-medium text-gray-300 cursor-pointer" onClick={handleToggle}>
          {label}
        </label>
      )}
    </div>
  );
};

export default Toggle;
