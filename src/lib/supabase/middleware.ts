import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingInvitePath,
  isContractorAppRoute,
  isOrgAppRoute,
  isOrganizationMember,
  isOrganizationPrimaryUser,
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
  const isDesktopShell =
    request.cookies.get("timvo_desktop")?.value === "1" ||
    request.nextUrl.searchParams.get("desktop") === "1";
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/client-preview");
  const isMarketingPage =
    path === "/welcome" || path === "/pricing" || path === "/download";
  const isPublicPage = path.startsWith("/invoice");
  const isApiRoute = path.startsWith("/api");

  // Desktop hybrid shell: skip marketing; send signed-in users into the app.
  if (isDesktopShell && isMarketingPage) {
    const url = request.nextUrl.clone();
    if (data.user) {
      url.pathname = await resolveHomePath(supabase, data.user.id);
      url.search = "";
    } else {
      url.pathname = "/login";
      url.search = "desktop=1";
    }
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set("timvo_desktop", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return redirect;
  }

  if (isDesktopShell && !request.cookies.get("timvo_desktop")) {
    supabaseResponse.cookies.set("timvo_desktop", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  if (!data.user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  if (!data.user && !isAuthPage && !isApiRoute && !isMarketingPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  if (data.user && (path === "/login" || path === "/welcome")) {
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

    if (await isOrganizationPrimaryUser(supabase, data.user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = "/org";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (data.user && isOrgAppRoute(path)) {
    if (!(await isOrganizationMember(supabase, data.user.id))) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Business users should never be trapped on the end-client portal
  if (data.user && path.startsWith("/client") && !(await isPortalOnlyUser(supabase, data.user.id))) {
    const url = request.nextUrl.clone();
    url.pathname = await resolveHomePath(supabase, data.user.id);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
