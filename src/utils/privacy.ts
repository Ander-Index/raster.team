/**
 * Privacy-policy readiness helpers.
 *
 * The repository ships an unfilled English privacy template. We must not
 * publish placeholder text as if it were a real legal policy, so a policy
 * is considered publishable only when every template token has been
 * replaced. Keep this pure and content-API-free for unit testing.
 */

/**
 * Shipped tokens are uppercase words joined by underscores, optionally
 * followed by guidance such as:
 *   [MINIMUM_AGE, e.g., 13 or 16]
 *   [ANALYTICS_PROVIDER or "Not used"]
 *   [OWNER_NAME / LEGAL_ENTITY]
 *
 * The lookahead after the first token prevents ordinary Markdown links and
 * mixed-case labels like `[GitHub](...)` or `[Privacy Policy](...)` from
 * being treated as placeholders. `[BRACKETS]` is the one shipped token
 * without an underscore.
 */
const TEMPLATE_TOKEN =
  /\[(?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+(?=[\s,/\]])(?:[^\]]*)|BRACKETS)\]/;

/** True when the body still contains unfilled template placeholders. */
export function hasPrivacyPlaceholders(body: string): boolean {
  return TEMPLATE_TOKEN.test(body);
}
