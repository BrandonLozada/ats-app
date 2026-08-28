export interface JobDetailUI {
  id: string;
  title: string;
  slug: string;
  description: string;

  salaryCurrency: string;
  salaryMin: number;
  salaryMax: number;

  organization: {
    id: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
  } | null;

  createdAt: string;
  publishedAt: string | null;

  alreadyApplied: boolean;
  alreadySaved: boolean;
}

export interface JobForFormUI {
  id: string;

  title: string;
  slug: string;
  description: string;

  categoryId: string;
  departmentId: string | null;
  pipelineId: string;

  employmentType: string;
}

// JobDTO
export interface JobWizardUI {
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

export interface JobPreviewUI {
  // StepBasicValues
  id: string;

  title: string;
  slug: string;
  description: string;

  employmentType: string;

  // categoryId: string;
  // departmentId?: string | null;
  // pipelineId: string;

  category: string;
  department?: string | null;
  pipeline: string;

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
