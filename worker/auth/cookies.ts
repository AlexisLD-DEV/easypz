export function sessionCookieHeader(token: string, request: Request) {
  return cookieHeader(`qe_session=${token}`, request, "Max-Age=1209600");
}

export function clearSessionCookieHeader(request: Request) {
  return cookieHeader("qe_session=", request, "Max-Age=0");
}

function cookieHeader(value: string, request: Request, maxAge: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${value}; HttpOnly${secure}; SameSite=Lax; Path=/; ${maxAge}`;
}
