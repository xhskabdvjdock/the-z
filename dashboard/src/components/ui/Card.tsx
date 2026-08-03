'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  hover?: boolean;
  children: ReactNode;
}

const Card = ({ title, description, hover = false, children, className, ...props }: CardProps) => {
  const cardContent = (
    <div
      className={cn(
        'bg-discord-not-quite-black-hover rounded-lg p-6',
        'border border-discord-not-quite-black',
        hover && 'transition-all duration-200 hover:border-discord-blurple/50 hover:shadow-lg',
        className
      )}
      {...props}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-400">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

export default Card;
