import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribers = new Set<() => void>();

let mediaQueryList: MediaQueryList | null = null;
let teardown: (() => void) | null = null;

function getMediaQueryList() {
  if (typeof window === 'undefined') return null;
  if (mediaQueryList) return mediaQueryList;

  mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
  return mediaQueryList;
}

function emit() {
  subscribers.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  subscribers.add(notify);

  const query = getMediaQueryList();
  if (query && !teardown) {
    const onChange = () => emit();
    query.addEventListener('change', onChange);
    teardown = () => query.removeEventListener('change', onChange);
  }

  return () => {
    subscribers.delete(notify);

    if (subscribers.size === 0 && teardown) {
      teardown();
      teardown = null;
    }
  };
}

function getSnapshot() {
  return getMediaQueryList()?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
