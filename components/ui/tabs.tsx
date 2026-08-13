'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list relative z-0 inline-flex items-center gap-0.5 rounded-lg p-0.5 text-muted-foreground border border-border/60 bg-muted/40 data-[variant=line]:rounded-none data-[variant=line]:border-none data-[variant=line]:bg-transparent data-[variant=line]:gap-2',
  {
    variants: {
      variant: {
        default: '',
        line: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'relative z-10 inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color] duration-150 ease-out hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:shrink-0 [&_svg]:size-3.5',
        'data-active:text-primary-foreground data-active:hover:bg-transparent',
        'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:hover:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        '-z-10 absolute top-[var(--active-tab-top)] left-[var(--active-tab-left)] h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-md border border-primary/20 bg-primary shadow-xs transition-[left,width,background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'group-data-[variant=line]/tabs-list:top-auto group-data-[variant=line]/tabs-list:bottom-0 group-data-[variant=line]/tabs-list:h-0.5 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-none group-data-[variant=line]/tabs-list:bg-primary group-data-[variant=line]/tabs-list:shadow-none',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel data-slot="tabs-content" className={cn('flex-1 text-sm outline-none', className)} {...props} />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger, tabsListVariants };
