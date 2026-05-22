# Email templates

## Layout (`src/services/email/mail-template.js`)

Generates standardized HTML and plain text for transactional emails.

- Input: template options (`locale`, title, greeting, paragraphs, CTA, footer, etc.)
- Output: `{ html, text }`

### Design rules

- Neutral palette (grays); no yellow accent blocks.
- Brand logo in header: embedded base64 from `weave-app/public/weave-notes-nobg.png` by default (works without external image hosting). Override with `EMAIL_LOGO_URL` if needed.
- `<html lang="...">` follows recipient locale (`pt-BR`, `en-US`, `es-ES`).
- **Never** expose tokens, internal IDs, or raw secret URLs in visible body or plain text.
- CTA links may contain query tokens in `href` only; plain text uses a generic hint instead of the full URL.

## i18n (`src/services/email/i18n/`)

- `resolveEmailLocale(raw)` — normalizes BCP 47 tags.
- `getUserEmailLocale({ userId, email })` — reads `users.user_preference.language.interface`.
- `t(locale, key, vars)` — template strings in `locales/pt-BR.js`, `en-US.js`, `es-ES.js`.
- Org invites to unknown emails use the **inviter's** locale.
- Multi-recipient jobs (due-date, AI report) build **one email per recipient** with that user's locale.

## Worker sync

Worker keeps copies of:

- `weave-worker/src/services/email/template.js` (layout)
- `weave-worker/src/services/email/i18n/` (translations)
- `backup-notification.js`, `due-reminder.js`, `ai-report.js` (active worker templates)

Comment `keep in sync with weave-api/...` when editing duplicated files.

## Env vars

```bash
EMAIL_LOGO_URL=          # optional; defaults to FRONTEND_URL/weave-notes-nobg.png
FRONTEND_URL=http://localhost:3000
CONTACT_EMAIL=us@weavenotes.app
```
