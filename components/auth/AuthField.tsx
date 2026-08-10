import type { Icon } from '@phosphor-icons/react';
import type React from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface AuthFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  icon: Icon;
  endSlot?: React.ReactNode;
  labelSlot?: React.ReactNode;
}

/** Icon-led input used across the auth screens — consistent height, focus
 *  ring, and left-icon inset so fields read as one system. */
export default function AuthField({
  label,
  icon: IconComponent,
  endSlot,
  labelSlot,
  className,
  id,
  ...props
}: AuthFieldProps) {
  return (
    <Field className="gap-2">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id} className="label-eyebrow text-foreground/80">
          {label}
        </FieldLabel>
        {labelSlot}
      </div>
      <div className="relative">
        <IconComponent
          size={16}
          weight="bold"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          aria-hidden="true"
        />
        <Input
          id={id}
          className={`h-11 rounded-lg pl-9 text-base transition-[border-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-accent/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 ${endSlot ? 'pr-11' : ''} ${className ?? ''}`}
          {...props}
        />
        {endSlot}
      </div>
    </Field>
  );
}
