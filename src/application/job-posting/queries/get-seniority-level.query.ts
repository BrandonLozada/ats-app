import { enumToOptions } from "@/domain/shared/mappers/enum-to-options.mapper";
import { SeniorityLevel } from "@/generated/prisma/enums";
import { SeniorityLevelLabels } from "@/domain/enums/seniority-level.enum";

export function getSeniorityLevel() {
  return enumToOptions(SeniorityLevel, SeniorityLevelLabels);
}
