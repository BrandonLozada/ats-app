/**
 * CurrentActor represents the authenticated identity context.
 * It is pure, framework-agnostic, and decoupled from Better Auth or ORM structures.
 */
export type CurrentActor = {
  userId: string;
  email: string;
  name: string;
};

export type RawActorSource = {
  user?: {
    id: string;
    email: string;
    name: string;
    [key: string]: unknown;
  } | null;
} | null | undefined;

/**
 * Maps a raw authentication session or user source into a canonical CurrentActor.
 * Strips away any provider/vendor-specific session metadata.
 */
export function mapToCurrentActor(source?: RawActorSource): CurrentActor | null {
  if (!source?.user) {
    return null;
  }

  return {
    userId: source.user.id,
    email: source.user.email,
    name: source.user.name,
  };
}
