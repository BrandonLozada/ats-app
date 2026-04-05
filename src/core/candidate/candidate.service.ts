import { CandidateRepository } from "./candidate.repository";
import { calculateCompleteness, canBeActivated } from "./candidate.rules";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { CreateCandidateInput, UpdateCandidateInput } from "./candidate.types";

export const CandidateService = {
  async create(input: CreateCandidateInput, userId?: string) {
    const completeness = calculateCompleteness(input);

    const candidate = await CandidateRepository.create({
      ...input,
      dataCompleteness: completeness,
      createdById: userId,
    });

    await AuditService.log({
      entity: "Candidate",
      entityId: candidate.id,
      action: "CREATE",
      userId,
    });

    return candidate;
  },

  async update(id: string, input: UpdateCandidateInput, userId?: string) {
    const existing = await CandidateRepository.findById(id);
    if (!existing) throw new Error("Candidate not found");

    const completeness = calculateCompleteness({
      ...existing,
      ...input,
    });

    if (input.status === "ACTIVE" && !canBeActivated(existing)) {
      throw new Error("Candidate does not meet activation criteria");
    }

    const updated = await CandidateRepository.update(id, {
      ...input,
      dataCompleteness: completeness,
      updatedById: userId,
    });

    await AuditService.log({
      entity: "Candidate",
      entityId: id,
      action: "UPDATE",
      userId,
    });

    return updated;
  },
};
