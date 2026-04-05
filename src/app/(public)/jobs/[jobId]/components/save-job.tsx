"use client";

import { useTransition } from "react";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { applyToJob } from "./actions";

// Por ahora no tiene sentido poder guardar las vacantes puesto a que es una herramienta ATS, no es una app de empleos cómo OCC, LinkedIn o Indeed
export default function SaveJob({
  jobId,
  alreadySaved,
}: {
  jobId: string;
  alreadySaved: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(() => applyToJob(jobId))}
    >
      {alreadySaved ? (
        <>
          <IconBookmarkFilled size={18} />
          Guardado
        </>
      ) : (
        <>
          <IconBookmark size={18} />
          Guardar
        </>
      )}
    </Button>
  );
}
