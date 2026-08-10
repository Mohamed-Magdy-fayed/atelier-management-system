const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SPECIALS = "!@#$%^&*?";

const ALL = `${LOWER}${UPPER}${DIGITS}${SPECIALS}`;
const PASSWORD_LENGTH = 14;

function randomInt(maxExclusive: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % maxExclusive;
}

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/**
 * Builds a password that always satisfies `passwordSchema` (lower, upper,
 * digit, special). Visually ambiguous characters (0/O, 1/l/I) are left out —
 * these get read aloud or retyped when handed to an atelier owner.
 */
export function generatePassword(): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIALS)];
  const rest = Array.from({ length: PASSWORD_LENGTH - required.length }, () =>
    pick(ALL),
  );
  const chars = [...required, ...rest];

  // Fisher-Yates, so the guaranteed characters are not always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
