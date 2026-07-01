import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // 認証不要なパスを除外: login / 静的ファイル / Auth.js API
  matcher: ["/((?!login|_next/static|_next/image|favicon\\.ico|api/auth).*)"],
};
