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
    path.startsWith("/accept-invite");
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

  if (data.user && path === "/" && !path.startsWith("/client")) {
    const { data: ownerClient } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    const { data: portalAccess } = await supabase
      .from("client_portal_access")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    if (!ownerClient && portalAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/client";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
