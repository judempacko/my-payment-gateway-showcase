import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border border-transparent px-3 py-1 text-sm font-normal whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive text-destructive-foreground focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: 'text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
        success: 'bg-blush-peach text-sienna-brown',
        warning: 'border-border bg-fog-white text-ink-black',
        danger: 'bg-ink-black text-paper-white',
        info: 'bg-mist-gray text-slate-gray',
        neutral: 'bg-fog-white text-slate-gray',
        accent: 'bg-blush-peach text-sienna-brown',
        statusSuccess: 'border-status-success-border bg-status-success-soft text-status-success',
        statusWarning: 'border-status-warning-border bg-status-warning-soft text-status-warning',
        statusDanger: 'border-status-danger-border bg-status-danger-soft text-status-danger',
        statusInfo: 'border-status-info-border bg-status-info-soft text-status-info',
        statusNeutral: 'border-border bg-fog-white text-slate-gray',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
