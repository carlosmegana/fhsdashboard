// Invite helpers shared by the signup action and the admin page. Server-only
// concerns (service-role access) stay in the callers; this file is pure logic.

export interface InviteRow {
  code: string;
  note: string | null;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export type InviteStatus = "active" | "used_up" | "expired" | "revoked";

export function inviteStatus(invite: InviteRow, now: Date = new Date()): InviteStatus {
  if (invite.revoked_at) return "revoked";
  if (invite.expires_at && new Date(invite.expires_at) <= now) return "expired";
  if (invite.use_count >= invite.max_uses) return "used_up";
  return "active";
}

// Unambiguous alphabet: no 0/O, 1/I/L so a code read out loud survives.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// e.g. FHS-K7PQ-M3WX
export function generateInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `FHS-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

// Codes are stored upper-case; accept whatever the user typed.
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function inviteLink(origin: string, code: string): string {
  return `${origin}/login?invite=${encodeURIComponent(code)}`;
}
