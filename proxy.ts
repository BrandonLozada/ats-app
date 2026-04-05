// Next.js 16 replaces "middleware" with "proxy". You can use the Node.js runtime for full session validation with database checks:
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"], // Specify the routes the middleware applies to
};

// For cookie-only checks (faster but less secure), use getSessionCookie:
// import { NextRequest, NextResponse } from "next/server";
// import { getSessionCookie } from "better-auth/cookies";

// export async function proxy(request: NextRequest) {
// 	const sessionCookie = getSessionCookie(request);

//     // THIS IS NOT SECURE!
//     // This is the recommended approach to optimistically redirect users
//     // We recommend handling auth checks in each page/route
// 	if (!sessionCookie) {
// 		return NextResponse.redirect(new URL("/", request.url));
// 	}

// 	return NextResponse.next();
// }

// export const config = {
// 	matcher: ["/dashboard"], // Specify the routes the middleware applies to
// };

// Supabase
// import { type NextRequest } from "next/server";
// import { updateSession } from "@/lib/supabase/proxy";

// export async function proxy(request: NextRequest) {
//   return await updateSession(request);
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * Feel free to modify this pattern to include more paths.
//      */
//     "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
//   ],
// };
