'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium mb-2 text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-4 py-2 bg-discord-not-quite-black border rounded-lg',
            'text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent',
            'transition-all duration-200 resize-y',
            'min-h-[100px]',
            error && 'border-discord-red focus:ring-discord-red',
            !error && 'border-discord-not-quite-black-hover',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-discord-red">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
