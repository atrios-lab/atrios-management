import { cva, type VariantProps } from "class-variance-authority";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const inputVariants = cva(
  // 16px no mobile evita o zoom automático do iOS ao focar o campo.
  "w-full rounded-field border bg-surface-1 px-3 text-base text-fg-2 outline-none transition-colors duration-200 placeholder:text-fg-8 focus:border-primary/40 md:text-sm",
  {
    variants: {
      size: {
        sm: "h-10 md:h-[34px]",
        md: "h-10 md:h-9",
        lg: "h-11 md:h-[38px]",
      },
      // `focused` forces the active border (for specimens); real focus
      // comes from the focus: variant above.
      focused: {
        true: "border-primary/40",
        false: "border-line-field",
      },
    },
    defaultVariants: { size: "md", focused: false },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Mono stack + code tracking, for codes/branches. */
  mono?: boolean;
}

export function Input({
  size,
  focused,
  mono = false,
  className,
  ...rest
}: InputProps) {
  return (
    <input
      className={cn(
        inputVariants({ size, focused }),
        mono && "font-mono tracking-[0.04em]",
        className,
      )}
      {...rest}
    />
  );
}
