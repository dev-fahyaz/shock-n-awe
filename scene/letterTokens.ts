import { getRecipientName } from './track';

const FALLBACKS: Record<string, string> = {
  firstName: 'there',
  company: 'your organisation',
};

export function applyTokens(body: string, recipient: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    recipient[key] ?? FALLBACKS[key] ?? '',
  );
}

export function letterText(bodyMdx: string) {
  return applyTokens(bodyMdx, getRecipientName());
}
