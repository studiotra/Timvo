import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingInvitePath,
  isContractorAppRoute,
  isPortalOnlyUser,
  resolveHomePath,
  safeNextPath,
} from "@/lib/auth/routing";

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

  if (data.user && path === "/login") {
    const url = request.nextUrl.clone();
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    if (next) {
      const nextUrl = new URL(next, request.url);
      url.pathname = nextUrl.pathname;
      url.search = nextUrl.search;
      return NextResponse.redirect(url);
    }
    url.pathname = await resolveHomePath(supabase, data.user.id);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (data.user && isContractorAppRoute(path)) {
    const pending = await getPendingInvitePath(supabase);
    if (pending) {
      const url = request.nextUrl.clone();
      const pendingUrl = new URL(pending, request.url);
      url.pathname = pendingUrl.pathname;
      url.search = pendingUrl.search;
      return NextResponse.redirect(url);
    }

    if (await isPortalOnlyUser(supabase, data.user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = "/client";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
