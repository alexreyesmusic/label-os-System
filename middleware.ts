import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    
    // Public routes - no authentication needed
    const isPublicRoute =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/onboarding" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico";

    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Check environment variables before calling Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Missing Supabase environment variables in middleware");
      // Allow request to proceed - route-level protection will handle it
      return NextResponse.next();
    }

    // Only protect dashboard routes
    if (pathname.startsWith("/dashboard")) {
      return await updateSession(request);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // Always allow request to proceed on error - let route-level auth handle it
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif).*)"]
};
