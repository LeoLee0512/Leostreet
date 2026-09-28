import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
  {
    variants: {
      variant: {
        primary:
          "border border-brass-deep bg-[linear-gradient(180deg,#c29a36,var(--color-brass-bright)_30%,var(--color-brass)_78%,#7d5f1a)] text-paper shadow-[inset_0_1px_0_#ffffff73,inset_0_-2px_0_#00000030,0_2px_6px_#3a2c1833] [text-shadow:0_1px_1px_#00000040] hover:brightness-[1.08] active:translate-y-px active:shadow-[inset_0_1px_0_#ffffff59,inset_0_-1px_0_#00000026,0_1px_2px_#3a2c1826]",
        secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "bg-transparent text-ink hover:bg-ink/10",
        danger: "border border-down bg-down/15 text-down hover:bg-down/25",
        up: "border border-up bg-up/15 text-up hover:bg-up/25",
      },
      size: {
        sm: "h-9 rounded-sm px-3 text-sm",
        md: "h-11 rounded-sm px-4 text-sm",
        lg: "h-12 rounded-sm px-5 text-base",
        icon: "size-11 rounded-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
