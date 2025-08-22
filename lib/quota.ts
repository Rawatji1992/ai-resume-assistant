// lib/quota.ts
const KEY = 'quota.v1';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readSafe() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { day: todayStr(), used: 0, _ssr: true };
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { day: todayStr(), used: 0 };
  } catch {
    return { day: todayStr(), used: 0 };
  }
}

function writeSafe(data: { day: string; used: number }) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return; // ignore on server
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function canUseToday(limit = 3) {
  const t = todayStr();
  let data = readSafe();
  if (data.day !== t) data = { day: t, used: 0 };
  return (data.used ?? 0) < limit;
}

export function recordUse() {
  const t = todayStr();
  let data = readSafe();
  if (data.day !== t) data = { day: t, used: 0 };
  data.used = (data.used ?? 0) + 1;
  writeSafe(data);
}

export function remaining(limit = 3) {
  const t = todayStr();
  let data = readSafe();
  if (data.day !== t) data = { day: t, used: 0 };
  return Math.max(0, limit - (data.used ?? 0));
}
