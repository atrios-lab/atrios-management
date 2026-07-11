import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-btn font-medium leading-none transition-colors duration-200 cursor-pointer disabled:cursor-default disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-primary text-white hover:bg-primary-hover disabled:hover:bg-primary",
        secondary:
          "border border-line-field-strong bg-transparent text-fg-3 hover:border-line-hover hover:text-fg-1",
        ghost:
          "border border-transparent bg-transparent text-fg-5 hover:bg-white/5 hover:text-fg-2",
        dashed:
          "border border-dashed border-line-hover bg-transparent text-fg-5 hover:text-fg-2",
      },
      // No mobile todos os tamanhos sobem para alvos de toque confortáveis.
      size: {
        sm: "h-9 px-3 text-[13px] md:h-7 md:text-[12.5px]",
        md: "h-10 px-3.5 text-[14px] md:h-[30px] md:px-3 md:text-[13px]",
        lg: "h-11 px-4 text-[14px] md:h-[34px] md:text-[13px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
