"use client";

import { useTransition } from "react";

// import { applyToJob } from "./actions";
import { Button } from "@/components/ui/button";

export default function ApplySection({
  jobId,
  alreadyApplied,
}: {
  jobId: string;
  alreadyApplied: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending || alreadyApplied}
      // onClick={() => startTransition(() => applyToJob(jobId))}
    >
      {alreadyApplied ? "Ya aplicaste" : "Aplicar"}
    </Button>
  );
}
