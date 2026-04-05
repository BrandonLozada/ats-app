"use client";

import { useState, type JSX } from "react";
import { IconLoader } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Google } from "@/components/icons/google";
import { signInWithOAuth } from "@/utils/auth-helpers/client";

type OAuthProviders = {
  name: string;
  displayName: string;
  icon: JSX.Element;
};

export function OauthSignIn() {
  const oAuthProviders: OAuthProviders[] = [
    {
      name: "google",
      displayName: "Login with Google",
      icon: <Google />,
    },
  ];

  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    provider: string,
  ) => {
    e.preventDefault();
    setActiveProvider(provider);
    await signInWithOAuth(e);
    setActiveProvider(null);
  };

  return (
    <div className="grid gap-6 mt-6">
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          O continúa con
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {oAuthProviders.map((provider) => {
          const isLoading = activeProvider === provider.name;

          return (
            <form
              key={provider.name}
              onSubmit={(e) => handleSubmit(e, provider.name)}
            >
              <input type="hidden" name="provider" value={provider.name} />
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                disabled={!!activeProvider}
              >
                {isLoading ? (
                  <IconLoader className="animate-spin w-5 h-5" />
                ) : (
                  provider.icon
                )}
                <span className="sr-only">{provider.displayName}</span>
              </Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
