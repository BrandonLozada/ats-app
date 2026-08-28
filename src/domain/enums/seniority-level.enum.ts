import { SeniorityLevel } from "@/generated/prisma/enums";

export const SeniorityLevelLabels: Record<SeniorityLevel, string> = {
  INTERN: "INTERN",
  JUNIOR: "JUNIOR",
  MID: "MID",
  SENIOR: "SENIOR",
  LEAD: "LEAD",
  MANAGER: "MANAGER",
  DIRECTOR: "DIRECTOR",
};
