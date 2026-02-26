import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/client-preview");
  const isApiRoute = path.startsWith("/api");

  if (!data.user && !isAuthPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && isAuthPage && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Redirect to client portal when user has portal access (signed up as client).
  // Even if they also own clients (dual role), send to /client first so client users get the right experience.
  if (data.user && path === "/") {
    const { data: portalAccess } = await supabase
      .from("client_portal_access")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    if (portalAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/client";
      return NextResponse.redirect(url);
    }
    // User has no portal access — check for pending invite (e.g. they logged in via /login after creating pw on accept-invite)
    const { data: pendingInv } = await supabase.rpc("get_my_pending_invite");
    const token = (pendingInv as { token?: string } | null)?.token;
    if (token) {
      const url = request.nextUrl.clone();
      url.pathname = "/accept-invite";
      url.searchParams.set("token", token);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
