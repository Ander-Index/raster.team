import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { hasPrivacyPlaceholders } from './privacy';

describe('privacy template validation', () => {
  test('detects the shipped SITE_NAME/SITE_URL template', () => {
    expect(hasPrivacyPlaceholders('How **[SITE_NAME]** handles **[SITE_URL]**')).toBe(true);
  });

  test('detects date/owner/contact placeholders', () => {
    expect(hasPrivacyPlaceholders('Contact **[CONTACT_EMAIL]**')).toBe(true);
    expect(hasPrivacyPlaceholders('Effective **[EFFECTIVE_DATE]**')).toBe(true);
    expect(hasPrivacyPlaceholders('Replace values in [BRACKETS].')).toBe(true);
  });

  test('detects every shipped provider/retention/age token form', () => {
    for (const token of [
      '[HOSTING_PROVIDER]',
      '[PRIVACY_CONTACT_EMAIL]',
      '[PRIVACY_CONTACT_NAME]',
      '[POSTAL_ADDRESS]',
      '[RETENTION_PERIOD]',
      '[MINIMUM_AGE, e.g., 13 or 16]',
      '[ANALYTICS_PROVIDER or "Not used"]',
      '[COMMENT_PROVIDER, e.g., Giscus/GitHub]',
      '[OWNER_NAME / LEGAL_ENTITY]',
    ]) {
      expect(hasPrivacyPlaceholders(`Policy text ${token}`)).toBe(true);
    }
  });

  test('partial completion still blocks publishing', () => {
    const mostlyFilled = [
      'Acme ("we") at https://acme.example.',
      '[OWNER_NAME / LEGAL_ENTITY]',
      '[PRIVACY_CONTACT_EMAIL]',
      '[RETENTION_PERIOD]',
    ].join('\n');
    expect(hasPrivacyPlaceholders(mostlyFilled)).toBe(true);
  });

  test('the actual shipped template is rejected', () => {
    const template = readFileSync('src/content/pages/en/privacy.md', 'utf8');
    expect(hasPrivacyPlaceholders(template)).toBe(true);
  });

  test('ordinary policy prose and Markdown links are publishable', () => {
    const prose = [
      'This policy explains what we collect and why.',
      'See [GitHub](https://github.com/) or [Privacy Policy](https://example.com/privacy).',
      'Read [PDF][1].',
      '',
      '[1]: https://example.com/file.pdf',
    ].join('\n');
    expect(hasPrivacyPlaceholders(prose)).toBe(false);
  });
});
