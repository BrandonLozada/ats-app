import { EmploymentType } from "@/generated/prisma/enums";

export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "Tiempo completo",
  PART_TIME: "Medio tiempo",
  CONTRACTOR: "Contrato",
  TEMPORARY: "Temporal",
  INTERN: "Prácticas",
  VOLUNTEER: "Voluntariado",
  PER_DIEM: "Por día",
};

// export const EmploymentTypeLabels: Record<EmploymentType, string> = {
//   FULL_TIME: 'FULL_TIME',
//   PART_TIME: 'PART_TIME',
//   CONTRACTOR: 'CONTRACTOR',
//   TEMPORARY: 'TEMPORARY',
//   INTERN: 'INTERN',
//   VOLUNTEER: 'VOLUNTEER',
//   PER_DIEM: 'PER_DIEM'
// };
