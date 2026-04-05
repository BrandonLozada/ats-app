"use client";

import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ModeToggleButton = ({
  className,
  ...props
}: ComponentProps<"button">) => {
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === "dark" ? "light" : "dark";

  const switchTheme = () => {
    setTheme(nextTheme);
  };

  const startViewTransition = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!document.startViewTransition) {
      switchTheme();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      switchTheme();
    });

    transition.ready.then(() => {
      const duration = 600;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "cubic-bezier(.76,.32,.29,.99)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <Button
      {...props}
      variant="ghost"
      size="icon"
      className={cn("", className)}
      aria-label={`Cambiar a modo ${nextTheme}`}
      onClick={startViewTransition}
    >
      {nextTheme === "dark" ? <IconSun /> : <IconMoon />}
    </Button>
  );
};

export default ModeToggleButton;
