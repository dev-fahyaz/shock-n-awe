import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { HandoffTokens } from './handoff';

export const CODE_TTL_SEC = 60;
const CODE_TTL_MS = CODE_TTL_SEC * 1000;

type Ticket = { tokens: HandoffTokens; exp: number };

/** One process (this Docker service). Codes do not survive restart or a second replica. */
const tickets = new Map<string, Ticket>();

function sweep(now = Date.now()) {
  for (const [code, ticket] of tickets) {
    if (ticket.exp <= now) tickets.delete(code);
  }
}

export function mintCode(tokens: HandoffTokens): { code: string; expires_in: number } {
  sweep();
  const code = randomBytes(32).toString('hex');
  tickets.set(code, { tokens, exp: Date.now() + CODE_TTL_MS });
  return { code, expires_in: CODE_TTL_SEC };
}

/** One-use. Returns null if missing, already used, or expired. */
export function redeemCode(raw: string): HandoffTokens | null {
  const code = raw.trim();
  if (!code) return null;
  sweep();
  const ticket = tickets.get(code);
  tickets.delete(code);
  if (!ticket || ticket.exp <= Date.now()) return null;
  return ticket.tokens;
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

/** `missing` if HANDOFF_SECRET is unset. Bearer or `x-handoff-secret`. */
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
