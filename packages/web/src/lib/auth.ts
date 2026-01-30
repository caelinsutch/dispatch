import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { headers } from "next/headers";
import * as schema from "@/db/schema";
import { checkAccessAllowed, parseAllowlist } from "./access-control";

// Type declarations for custom session data
export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // GitHub-specific fields (added via session customization)
  login?: string;
}

export interface Session {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    token: string;
  };
  user: SessionUser;
}

// Extended session with GitHub OAuth data
export interface SessionWithToken extends Session {
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

/**
 * Create a Better Auth instance with the D1 database.
 * Must be called within a request context to access Cloudflare bindings.
 */
export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        scope: ["read:user", "user:email", "repo"],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            // Access control check during sign-in
            const profile = ctx?.context?.socialProfile as { login?: string } | undefined;

            const config = {
              allowedDomains: parseAllowlist(process.env.ALLOWED_EMAIL_DOMAINS),
              allowedUsers: parseAllowlist(process.env.ALLOWED_USERS),
            };

            const isAllowed = checkAccessAllowed(config, {
              githubUsername: profile?.login,
              email: user.email ?? undefined,
            });

            if (!isAllowed) {
              throw new Error("Access denied. User not in allowlist.");
            }

            return { data: user };
          },
        },
      },
    },
    pages: {
      error: "/access-denied",
    },
  });
}

/**
 * Get the current session on the server side.
 * Use this in API routes and Server Components.
 */
export async function getServerSession(): Promise<SessionWithToken | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  // Get the GitHub account data to retrieve the access token
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });

  const githubAccount = accounts?.find(
    (acc: { providerId: string }) => acc.providerId === "github"
  );

  // Construct the session with token data
  const sessionWithToken: SessionWithToken = {
    session: session.session,
    user: {
      ...session.user,
      login: githubAccount?.accountId,
    },
  };

  if (githubAccount) {
    sessionWithToken.accessToken = (githubAccount as { accessToken?: string }).accessToken;
    const expiresAt = (githubAccount as { accessTokenExpiresAt?: Date }).accessTokenExpiresAt;
    if (expiresAt) {
      sessionWithToken.accessTokenExpiresAt = new Date(expiresAt).getTime();
    }
  }

  return sessionWithToken;
}

// Re-export auth type for client usage
export type Auth = Awaited<ReturnType<typeof getAuth>>;
