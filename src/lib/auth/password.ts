import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export const MIN_PASSWORD_LENGTH = 8;

/** Senha guardada só como hash bcrypt (10 rodadas), nunca em texto. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
