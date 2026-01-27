import { cn } from "@/lib/utils";

interface IconToggleProps {
  isToggled: boolean;
  primary: React.ReactNode;    // Icon when isToggled = false
  secondary: React.ReactNode;  // Icon when isToggled = true
  className?: string;
}

export function IconToggle({
  isToggled,
  primary,
  secondary,
  className = "size-4"
}: IconToggleProps) {
  return (
    <span className={cn("relative flex items-center justify-center", className)}>
      {/* Primary icon - visible by default */}
      <div
        className={cn(
          "transition-all",
          isToggled ? "-rotate-90 scale-0" : "rotate-0 scale-100"
        )}
      >
        {primary}
      </div>

      {/* Secondary icon - hidden by default */}
      <div
        className={cn(
          "absolute transition-all",
          isToggled ? "rotate-0 scale-100" : "rotate-90 scale-0"
        )}
      >
        {secondary}
      </div>
    </span>
  );
}
