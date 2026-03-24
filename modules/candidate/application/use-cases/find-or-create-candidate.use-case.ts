import { candidateRepository } from "../../infrastructure/candidate.repository";
import { FindOrCreateCandidateInput } from "../../candidate.schema";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import { normalizePhone } from "@/shared/utils/normalize-phone";

export async function findOrCreateCandidate(input: FindOrCreateCandidateInput) {
  let candidate = null;

  if (input.email) {
    const email = normalizeEmail(input.email);

    candidate = await candidateRepository.findByEmail(email);
  }

  if (!candidate && input.phone) {
    const phone = normalizePhone(input.phone);

    candidate = await candidateRepository.findByPhone(phone);
  }

  if (candidate) return candidate;

  // Cuando la propiedad en zod es "optional" tengo que mandar su valor falsy cómo undefined en lugar de null.
  return candidateRepository.create({
    ...input,
    email: input.email ? normalizeEmail(input.email) : undefined,
    phone: input.phone ? normalizePhone(input.phone) : undefined,
  });
}
