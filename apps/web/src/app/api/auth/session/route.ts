import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  // getUser() validates against Supabase's server — secure auth check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: "No active session" },
      { status: 401, headers: corsHeaders },
    );
  }

  // getSession() to read the raw tokens — only reached after user is validated
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: "No active session" },
      { status: 401, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
      },
    },
    { status: 200, headers: corsHeaders },
  );
}
