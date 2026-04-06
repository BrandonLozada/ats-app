"use client";

import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  loading: boolean;
  children: React.ReactNode;
}

export function AlertModal({
  title,
  description,
  onConfirm,
  loading = false,
  children,
}: AlertModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <AlertDialog>
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Regresar</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={onConfirm}>
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
