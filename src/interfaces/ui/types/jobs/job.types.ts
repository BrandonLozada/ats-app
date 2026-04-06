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
