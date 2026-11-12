import * as React from 'react';
import { cn } from '@/lib/utils.js';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-[#e8ece8] bg-white px-3 py-2 text-sm text-[#252b26] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#9a9f9b] focus-visible:outline-none focus-visible:border-[#2f7459] focus-visible:ring-2 focus-visible:ring-[#2f7459]/20 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
