"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JobColumn } from "./columns";
import { IconCopy, IconEye } from "@tabler/icons-react";

interface CellActionProps {
  data: JobColumn;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Job ID copiado al portapapeles.");
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => onCopy(data.id)}>
        <IconCopy className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => router.push(`/admin/jobs/${data.id}`)}
      >
        <IconEye className="h-4 w-4" />
        Ver detalle
      </Button>
    </div>
  );
}
