import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full',
    'text-[13.5px] font-medium tracking-[-0.01em] leading-none',
    'transition-[background-color,border-color,color,transform,opacity] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dce8eb]/45',
    'disabled:pointer-events-none disabled:opacity-45',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[#f6f5f1] text-[#030304] hover:bg-[#ffffff] shadow-[0_1px_12px_rgba(246,245,241,0.12)]',
        secondary:
          'bg-[#f6f5f1]/[0.07] text-[#f6f5f1] border border-[#f6f5f1]/[0.14] hover:bg-[#f6f5f1]/[0.12] hover:border-[#f6f5f1]/[0.24]',
        ghost:
          'bg-transparent text-[#f6f5f1]/75 hover:text-[#f6f5f1] hover:bg-[#f6f5f1]/[0.06]',
        outline:
          'bg-transparent text-[#f6f5f1] border border-[#f6f5f1]/[0.18] hover:border-[#f6f5f1]/[0.36] hover:bg-[#f6f5f1]/[0.05]',
      },
      size: {
        /* Optical vertical centering (-2px down: padding-top = padding-bottom + 2px) */
        sm: 'h-8 px-3.5 pt-[8px] pb-[6px] text-[12.5px]',
        md: 'h-10 px-5 pt-[11px] pb-[9px] text-[13.5px]',
        lg: 'h-12 px-6 pt-[13px] pb-[11px] text-[14.5px]',
        icon: 'h-9 w-9 pt-[2px] pb-0 px-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
