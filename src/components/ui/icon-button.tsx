import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface IconButtonProps {
  variant?: "default" | "ghost" | "outline" | "primary";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const variantClasses = {
  default: "bg-muted hover:bg-muted-foreground/20",
  ghost: "hover:bg-muted",
  outline: "border border-border hover:bg-muted",
  primary: "bg-primary/10 text-primary hover:bg-primary/20",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", children, onClick, disabled, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "rounded-full flex items-center justify-center transition-all duration-100 ease-out active:scale-95 press tap-target disabled:opacity-50 disabled:pointer-events-none",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-label={props["aria-label"]}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default IconButton;