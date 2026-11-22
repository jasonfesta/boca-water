import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 pt-[5px] pb-[4px] text-[12px] font-medium leading-none tracking-[-0.01em] transition-colors',
  {
    variants: {
      variant: {
        neutral:
          'bg-[#f6f5f1]/[0.06] text-[#f6f5f1]/80 border border-[#f6f5f1]/[0.12]',
        mineral:
          'bg-[#7fa8b2]/[0.12] text-[#dce8eb] border border-[#7fa8b2]/[0.26]',
        solid: 'bg-[#f6f5f1] text-[#030304]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
