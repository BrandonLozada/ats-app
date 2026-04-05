import { ApplicationRepository } from "@/infrastructure/prisma/repositories/application.repository";

export class ApplyToJobUseCase {
  constructor(private repo: ApplicationRepository) {}

  async execute(params: {
    candidateId: string;
    jobPostingId: string;
    userId?: string;
  }) {
    const exists = await this.repo.exists(
      params.candidateId,
      params.jobPostingId,
    );

    if (exists) {
      throw new Error("Already applied");
    }

    const app = this.repo.create(params);

    await this.repo.save(app, params.userId);

    return app;
  }
}
