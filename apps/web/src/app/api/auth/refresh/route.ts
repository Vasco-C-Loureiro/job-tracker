import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "refreshToken required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { refreshToken } = body as { refreshToken?: string };
  if (!refreshToken) {
    return NextResponse.json(
      { error: "refreshToken required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Invalid or expired refresh token" },
      { status: 401, headers: corsHeaders },
    );
  }

  const session = data.session;
  return NextResponse.json(
    {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    },
    { status: 200, headers: corsHeaders },
  );
}
