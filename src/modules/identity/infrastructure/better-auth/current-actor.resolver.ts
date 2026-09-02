import { getServerSession } from "./session.service";
import {
  mapToCurrentActor,
  type CurrentActor,
} from "../../application/current-actor";

export type { CurrentActor };

/**
 * Resolves the CurrentActor from the current session context.
 * Returns CurrentActor if authenticated, or null if anonymous.
 *
 * Always retrieves authentication state from the canonical internal getServerSession().
 * Caller-controlled session injection is strictly prevented.
 */
export async function resolveCurrentActor(): Promise<CurrentActor | null> {
  const session = await getServerSession();
  return mapToCurrentActor(session as Parameters<typeof mapToCurrentActor>[0]);
}
