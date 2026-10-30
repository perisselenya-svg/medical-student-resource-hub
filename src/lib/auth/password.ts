import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

let dummyHash: Promise<string> | null = null;

/**
 * Constant-work password check. When the account does not exist we still run
 * a bcrypt comparison against a dummy hash so response timing does not reveal
 * which email addresses are registered (user enumeration).
 */
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash("timing-equaliser", BCRYPT_COST);
    await bcrypt.compare(plain, await dummyHash);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
