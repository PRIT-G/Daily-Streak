import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#2f7459] text-white hover:bg-[#256049]',
        secondary: 'border-transparent bg-[#edf5ef] text-[#316a4f] hover:bg-[#e2ede5]',
        destructive: 'border-transparent bg-red-500 text-white hover:bg-red-600',
        outline: 'text-[#252b26] border-[#e8ece8]',
        subtle: 'border-transparent bg-[#f5f7f4] text-[#7a827b]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
