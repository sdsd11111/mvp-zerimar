import { NextRequest, NextResponse } from "next/server";

// Si defines CRM_PASSWORD, el CRM pide usuario (cualquiera) + esa clave.
export function middleware(req: NextRequest) {
  const pass = process.env.CRM_PASSWORD;
  if (!pass) return NextResponse.next();
  const h = req.headers.get("authorization") ?? "";
  if (h.startsWith("Basic ")) {
    const cred = atob(h.slice(6));
    if (cred.slice(cred.indexOf(":") + 1) === pass) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="CRM"' } });
}

export const config = { matcher: ["/crm/:path*", "/api/crm/:path*", "/api/simulador"] };
