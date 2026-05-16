/** Same contract as `FormBase`: dotted i18n paths used as Zod `message` values. */
const TRANSLATION_KEY_RE = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-])+$/u;

export function isTranslationKey(message: string): boolean {
  return TRANSLATION_KEY_RE.test(message);
}

/**
 * Turn a Zod / validator `message` into user-visible text. Dotted keys are passed
 * through the active locale `t` function; anything else is returned verbatim.
 */
export function translateFormErrorMessage(
  t: (key: string) => string,
  message?: string,
): string | undefined {
  if (!message) {
    return message;
  }

  if (!isTranslationKey(message)) {
    return message;
  }

  try {
    return t(message);
  } catch {
    return message;
  }
}

export function translateZodIssueMessages(
  t: (key: string) => string,
  issues: Array<{ message?: string }>,
): string {
  return issues
    .map((i) => translateFormErrorMessage(t, i.message))
    .filter((m): m is string => Boolean(m && m.length > 0))
    .join("\n");
}
