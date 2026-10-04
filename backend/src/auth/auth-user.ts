import { User } from '@prisma/client';

export type SessionInfo = { iat: number; exp: number; at?: number };

/** Utilisateur authentifié (req.user) : jamais de mot de passe, session de transport uniquement. */
export type AuthUser = Omit<User, 'password'> & { session?: SessionInfo };

export type AuthenticatedRequest = { user?: AuthUser };
