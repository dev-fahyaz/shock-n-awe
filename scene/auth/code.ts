import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { HandoffTokens } from './handoff';

export const CODE_TTL_SEC = 60;
const CODE_TTL_MS = CODE_TTL_SEC * 1000;
const REPLAY_TTL_MS = 15_000;

type Ticket = { tokens: HandoffTokens; exp: number };
type LogoutTicket = { next: string | null; exp: number };

type HandoffStore = {
  tickets: Map<string, Ticket>;
  recentlyRedeemed: Map<string, Ticket>;
  logoutTickets: Map<string, LogoutTicket>;
};

/** Survive Next.js HMR — module Maps are wiped when /consume first compiles. */
function store(): HandoffStore {
  const g = globalThis as typeof globalThis & { __snaHandoffStore?: HandoffStore };
  if (!g.__snaHandoffStore) {
    g.__snaHandoffStore = {
      tickets: new Map(),
      recentlyRedeemed: new Map(),
      logoutTickets: new Map(),
    };
  }
  return g.__snaHandoffStore;
}

function sweep(now = Date.now()) {
  const { tickets, recentlyRedeemed, logoutTickets } = store();
  for (const [code, ticket] of tickets) {
    if (ticket.exp <= now) tickets.delete(code);
  }
  for (const [code, ticket] of recentlyRedeemed) {
    if (ticket.exp <= now) recentlyRedeemed.delete(code);
  }
  for (const [code, ticket] of logoutTickets) {
    if (ticket.exp <= now) logoutTickets.delete(code);
  }
}

export function mintCode(tokens: HandoffTokens): { code: string; expires_in: number } {
  sweep();
  const code = randomBytes(32).toString('hex');
  store().tickets.set(code, { tokens, exp: Date.now() + CODE_TTL_MS });
  return { code, expires_in: CODE_TTL_SEC };
}

/** First call consumes; repeats within ~15s return the same tokens (duplicate GETs). */
export function redeemCode(raw: string): HandoffTokens | null {
  const code = raw.trim();
  if (!code) return null;
  sweep();
  const { tickets, recentlyRedeemed } = store();
  const fresh = tickets.get(code);
  if (fresh && fresh.exp > Date.now()) {
    tickets.delete(code);
    recentlyRedeemed.set(code, { tokens: fresh.tokens, exp: Date.now() + REPLAY_TTL_MS });
    return fresh.tokens;
  }
  const recent = recentlyRedeemed.get(code);
  if (recent && recent.exp > Date.now()) return recent.tokens;
  return null;
}

/** Logout ticket. `next` is a trusted hub URL or null. */
export function mintLogoutCode(next: string | null): { code: string; expires_in: number } {
  sweep();
  const code = randomBytes(32).toString('hex');
  store().logoutTickets.set(code, { next, exp: Date.now() + CODE_TTL_MS });
  return { code, expires_in: CODE_TTL_SEC };
}

/** One-use. Returns `{ next }` or null if missing / expired. */
export function redeemLogoutCode(raw: string): { next: string | null } | null {
  const code = raw.trim();
  if (!code) return null;
  sweep();
  const { logoutTickets } = store();
  const ticket = logoutTickets.get(code);
  logoutTickets.delete(code);
  if (!ticket || ticket.exp <= Date.now()) return null;
  return { next: ticket.next };
}

export function handoffSecret(): string {
  return process.env.HANDOFF_SECRET?.trim() ?? '';
}

function secretsEqual(offered: string, expected: string): boolean {
  const a = Buffer.from(offered);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** `missing` if HANDOFF_SECRET unset. Bearer or `x-handoff-secret`. */
export function secretMatches(req: Request): 'missing' | 'bad' | 'ok' {
  const expected = handoffSecret();
  if (!expected) return 'missing';
  const auth = req.headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : '';
  const header = req.headers.get('x-handoff-secret')?.trim() ?? '';
  const offered = bearer || header;
  if (!offered || !secretsEqual(offered, expected)) return 'bad';
  return 'ok';
}
