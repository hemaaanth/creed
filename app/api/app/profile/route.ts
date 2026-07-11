import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function PATCH(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  // display_name is the key the app reads first (see lib/user-name.ts): OAuth
  // logins refresh name/full_name from the provider's identity, so a custom
  // name stored only there gets clobbered on the next Google sign-in. The
  // legacy keys are still written for anything external that reads them.
  const { data, error } = await auth.supabase.auth.updateUser({
    data: {
      display_name: name,
      name,
      full_name: name,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: data.user
      ? {
          name,
          email: data.user.email ?? "",
        }
      : null,
  });
}
