import { CandidateRepository } from "./candidate.repository";
import { calculateCompleteness, canBeActivated } from "./candidate.rules";
import { AuditService } from "@/infrastructure/audit/audit.service";
import { CreateCandidateInput, UpdateCandidateInput } from "./candidate.types";
import { normalizeEmail } from "@/shared/utils/normalize-email";

export const CandidateService = {
  async create(input: CreateCandidateInput, userId?: string) {
    const tenantId = (input as { tenantId?: string }).tenantId;
    if (!tenantId || tenantId.trim() === "") {
      throw new Error("Transitional CandidateService.create: tenantId is required and cannot be empty.");
    }
    if (!input.email || input.email.trim() === "") {
      throw new Error("Transitional CandidateService.create: email is required and cannot be empty.");
    }
    const normalizedEmail = normalizeEmail(input.email);
    if (!normalizedEmail || normalizedEmail.trim() === "") {
      throw new Error("Transitional CandidateService.create: normalizedEmail cannot be empty.");
    }

    const completeness = calculateCompleteness(input);

    const candidate = await CandidateRepository.create({
      ...input,
      email: input.email,
      emailNormalized: normalizedEmail,
      tenantId,
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
