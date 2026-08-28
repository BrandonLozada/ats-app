import { enumToOptions } from "@/domain/shared/mappers/enum-to-options.mapper";
import { EmploymentType } from "@/generated/prisma/enums";
import { EmploymentTypeLabels } from "@/domain/enums/employment-type.enum";

export function getEmploymentType() {
  return enumToOptions(EmploymentType, EmploymentTypeLabels);
}
