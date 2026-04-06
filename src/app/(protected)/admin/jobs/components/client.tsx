"use client";

import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table";
import { JobColumn, createColumns } from "./columns";

interface JobClientProps {
  data: JobColumn[];
}

export function JobClient({ data }: JobClientProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Vacantes (${data.length})`}
          description="Administra las vacantes de tu organización"
        />
        <Button asChild>
          <Link href={`/admin/jobs/new`}>
            <IconPlus /> Agregar nueva
          </Link>
        </Button>
      </div>
      <Separator />
      <DataTable searchKey={"title"} columns={createColumns()} data={data} />
    </>
  );
}
