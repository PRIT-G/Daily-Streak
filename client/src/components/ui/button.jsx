import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#2f7459] text-white shadow hover:bg-[#256049] focus-visible:ring-[#2f7459]',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600',
        outline:
          'border border-[#e8ece8] bg-white text-[#252b26] shadow-sm hover:bg-[#f6f8f6] hover:border-[#d0d6d0] focus-visible:ring-[#2f7459]',
        secondary:
          'bg-[#edf5ef] text-[#316a4f] shadow-sm hover:bg-[#e2ede5] focus-visible:ring-[#316a4f]',
        ghost: 'hover:bg-[#f5f7f4] text-[#252b26] focus-visible:ring-[#2f7459]',
        link: 'text-[#2f7459] underline-offset-4 hover:underline',
        dark: 'bg-[#252b26] text-white shadow hover:bg-[#1a1f1b] focus-visible:ring-[#252b26]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
