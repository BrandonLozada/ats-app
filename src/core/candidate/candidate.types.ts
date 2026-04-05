export interface CreateCandidateInput {
  name: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  sourceId?: string;
}

export interface UpdateCandidateInput {
  name?: string;
  email?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "BLACKLISTED";
}
