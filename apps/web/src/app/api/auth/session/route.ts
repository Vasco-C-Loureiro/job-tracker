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
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.access_token) {
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
        id: session.user.id,
        email: session.user.email,
      },
    },
    { status: 200, headers: corsHeaders },
  );
}
