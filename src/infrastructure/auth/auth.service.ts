import { getServerSession } from "@/infrastructure/auth/auth.server";

export const AuthService = {
  async getSession() {
    return await getServerSession();
  },

  async requireSession() {
    const session = await this.getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return session;
  },
};
