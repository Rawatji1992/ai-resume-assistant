export function canUseToday(limit = 3) {
  const key = 'quota.v1';
  const today = new Date().toISOString().slice(0,10);
  const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  let data = raw ? JSON.parse(raw) : { day: today, used: 0 };
  if (data.day !== today) data = { day: today, used: 0 };
  return data.used < limit;
}
export function recordUse() {
  const key = 'quota.v1';
  const today = new Date().toISOString().slice(0,10);
  const raw = localStorage.getItem(key);
  let data = raw ? JSON.parse(raw) : { day: today, used: 0 };
  if (data.day !== today) data = { day: today, used: 0 };
  data.used += 1;
  localStorage.setItem(key, JSON.stringify(data));
}
export function remaining(limit = 3) {
  const key = 'quota.v1';
  const today = new Date().toISOString().slice(0,10);
  const raw = localStorage.getItem(key);
  let data = raw ? JSON.parse(raw) : { day: today, used: 0 };
  if (data.day !== today) data = { day: today, used: 0 };
  return Math.max(0, limit - data.used);
}
