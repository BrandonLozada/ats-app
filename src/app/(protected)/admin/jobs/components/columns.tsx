"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type JobColumn = {
  id: string;
  title: string;
  createdAt: string;
};

export const createColumns = (): ColumnDef<JobColumn>[] => [
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "createdAt",
    header: "Creada en",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
