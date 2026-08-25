import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, type PressableProps } from "react-native";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "flex-row items-center justify-center gap-2",
  {
    variants: {
      variant: {
        apple: "bg-black dark:border dark:border-google-border dark:bg-white",
        kakao: "bg-kakao",
        google: "border border-google-border bg-white",
      },
      size: {
        social: "h-[45px] w-72 rounded-full",
      },
    },
    defaultVariants: {
      size: "social",
    },
  },
);

export const buttonTextVariants = cva("text-base font-semibold", {
  variants: {
    variant: {
      apple: "text-white dark:text-black",
      kakao: "text-black/85",
      google: "text-google-text",
    },
  },
});

export type ButtonProps = Omit<PressableProps, "style"> &
  VariantProps<typeof buttonVariants> & { className?: string };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(buttonVariants({ variant, size }), className)}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
      {...props}
    />
  );
}
