"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JobColumn } from "./columns";
import { deleteJobAction } from "../actions/delete-job.action";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertModal } from "@/components/modals/alert-modal";
import { IconCopy, IconEye, IconTrash } from "@tabler/icons-react";

interface CellActionProps {
  data: JobColumn;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Job ID copiado al portapapeles.");
  };

  // TODO: Implementar la función de eliminación de vacante.
  async function onDelete(id: string) {
    try {
      setLoading(true);
      await deleteJobAction({ id });
      console.log("\nID: ", id);
      toast.success("Vacante eliminado correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error al eliminar la vacante: ", error);
      toast.error(
        "Error al eliminar la vacante. Por favor, inténtalo de nuevo más tarde.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AlertModal
        title="¿Estás seguro de que deseas eliminar esta vacante?"
        description="Esta acción no se puede deshacer. La vacante será eliminado de forma permanente y no podrás recuperarlo."
        onConfirm={() => onDelete(data.id)}
        loading={loading}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(data.id)}
            disabled={loading}
          >
            <IconCopy className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/admin/jobs/${data.id}`)}
            disabled={loading}
          >
            <IconEye className="h-4 w-4" />
            Ver detalle
          </Button>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={loading}>
              <IconTrash className="h-4 w-4" />
              Eliminar
            </Button>
          </AlertDialogTrigger>
        </div>
      </AlertModal>
    </>
  );
}
