import { EmploymentType, SeniorityLevel } from "@/generated/prisma/enums";

export interface UpdateJobInput {
  jobId: string;

  title?: string;
  slug?: string;
  description?: string;

  responsibilities?: string;
  requirements?: string;
  benefits?: string;

  employmentType?: EmploymentType;
  seniorityLevel?: SeniorityLevel;

  categoryId?: string;
  departmentId?: string | null | undefined; // undefined para no modificar, null para quitar, string para asignar
  pipelineId?: string;

  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;

  isRemote?: boolean;
  applyUrl?: string;

  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;

  publishedAt?: Date;
  validThrough?: Date;

  organizationId?: string;
  totalPositions?: number;
}
