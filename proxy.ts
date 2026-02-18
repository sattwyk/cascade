import { NextResponse } from 'next/server';

export function proxy() {
  // Your middleware logic
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow/.*).*)'],
};
