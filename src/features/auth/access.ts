import "server-only";
/** Technical Auth identity, resolved only by the server. No mailbox is required. */
export function ownerLoginEmail() {
  return process.env.GYM_OWNER_LOGIN_EMAIL?.trim() || null;
}
