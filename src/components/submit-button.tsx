"use client";

import { type ComponentProps } from "react";
import { IconLoader } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

type Props = ComponentProps<"button"> & {
  pendingText?: string;
  isSubmitting?: boolean;
};

export function SubmitButton({
  children,
  pendingText,
  disabled,
  isSubmitting,
  ...props
}: Props) {
  return (
    <Button {...props} type="submit" disabled={disabled || isSubmitting}>
      {isSubmitting ? (
        <>
          <IconLoader className="animate-spin" />
          {pendingText || "Enviando..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
