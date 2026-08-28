// lectura (UI)

export interface JobDTO {
  // StepBasicValues
  id: string;

  title: string;
  slug: string;
  description: string;

  employmentType: string;

  categoryId: string;
  departmentId?: string | null;
  pipelineId: string;

  // StepDetailsValues
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;

  seniorityLevel?: string | null;

  // StepSalaryValues
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;

  isRemote: boolean;
  applyUrl?: string | null;

  // StepSEOValues
  metaTitle?: string | null;
  metaDescription?: string | null;
  noIndex: boolean;

  publishedAt?: Date | null;
  validThrough?: Date | null;

  organizationId?: string | null;

  //
  branches: {
    branchId: string;
    name: string;
  }[];
}
