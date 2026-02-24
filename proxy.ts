import { NextResponse, type NextRequest } from 'next/server';

const VISITOR_COOKIE = 'cascade-visitor-id';
const USER_ID_COOKIE = 'cascade-user-id';

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  const existingVisitorId =
    request.cookies.get(VISITOR_COOKIE)?.value ?? request.headers.get('x-cascade-visitor-id') ?? undefined;
  const visitorId = existingVisitorId ?? crypto.randomUUID();

  const derivedUserId =
    request.cookies.get(USER_ID_COOKIE)?.value ??
    request.cookies.get('cascade-wallet')?.value ??
    request.cookies.get('cascade-user-email')?.value ??
    request.headers.get('x-cascade-user-id') ??
    request.headers.get('x-cascade-wallet') ??
    request.headers.get('x-cascade-user-email') ??
    undefined;

  requestHeaders.set('x-cascade-visitor-id', visitorId);
  if (derivedUserId) {
    requestHeaders.set('x-cascade-user-id', derivedUserId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!existingVisitorId) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow/.*).*)'],
};
