import { IconBriefcase } from "@tabler/icons-react";

import { APP_NAME } from "@/config/app";
import Link from "next/link";
import { requireAuth } from "@/infrastructure/auth/route.guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const user = session ? session.user : null;

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 z-50 border-b bg-background/50 backdrop-blur-2xl">
        <nav className="h-full flex items-center px-6">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary">
                <IconBriefcase size={24} stroke={1.5} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                {APP_NAME}
              </span>
            </div>
          </Link>
        </nav>
      </header>
      <main className="pt-16 min-h-screen flex-1">{children}</main>
      <footer></footer>
    </>
  );
}
