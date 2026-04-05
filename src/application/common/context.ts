export interface AppContext {
  userId: string;
  roles: string[];
  permissions: string[];

  attributes?: {
    department?: string;
    organization?: string;
  }
}
