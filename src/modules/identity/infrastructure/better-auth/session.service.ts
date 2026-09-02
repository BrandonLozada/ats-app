import { headers } from "next/headers";
import { auth } from "./auth.config";

export async function getServerSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

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
