import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { controlPlaneFetch } from "@/lib/control-plane";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const user = session.user;
    const userId = user.id || user.email || "anonymous";

    const response = await controlPlaneFetch(`/sessions/${sessionId}/ws-token`, {
      method: "POST",
      body: JSON.stringify({
        userId,
        githubUserId: user.id,
        githubLogin: user.login,
        githubName: user.name,
        githubEmail: user.email,
        githubToken: session.accessToken,
        githubTokenExpiresAt: session.accessTokenExpiresAt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to generate WS token: ${error}`);
      return NextResponse.json({ error: "Failed to generate token" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to generate WS token:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
