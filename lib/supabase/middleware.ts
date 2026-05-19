import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function updateSession(request: NextRequest) {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Missing Supabase credentials in middleware - allowing request to proceed");
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next({ request });

    // Create Supabase client with safe error handling
    let supabase;
    try {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: CookieToSet[]) {
              cookiesToSet.forEach(({ name, value }: CookieToSet) => request.cookies.set(name, value));
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }: CookieToSet) => response.cookies.set(name, value, options));
            }
          }
        }
      );
    } catch (clientError) {
      console.error("Failed to create Supabase client:", clientError);
      // Redirect to login on client creation failure
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Get user with proper error handling
    let data, error;
    try {
      const result = await supabase.auth.getUser();
      data = result.data;
      error = result.error;
    } catch (authError) {
      console.error("Failed to get user from Supabase:", authError);
      // On auth error, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Check if user is authenticated
    if (error || !data?.user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error("Unexpected middleware error:", error);
    // On any unexpected error, redirect to login instead of crashing
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
}
