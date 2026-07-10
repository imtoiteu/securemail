# BUILD_LOG — visual theme experiment: tested and rejected

## Final status

The restored pink/red visual state was **approved** (2026-07-10) and released
as **v0.1.3**, tag `secure-mail-v0.1.3` on `internal-stable-v1`.

## Outcome

The experimental navy/teal internal theme was **rejected after visual review**
(2026-07-10). `internal-stable-v1` was returned to the approved pink/red
visual state.

- Rollback point: tag **`before-theme-change`** = commit `19178968`
  (v0.1.2). `internal-stable-v1` never left this commit, so the rollback was
  `git checkout internal-stable-v1`; `git diff before-theme-change` is empty.
- The experiment is preserved (not deleted) on branch
  **`theme-internal-palette-test`** (commits `12670457` palette,
  `82ab7a62` polish) in case it is ever revisited.

## Files restored (by returning to the tag; no manual edits)

All 22 files the theme experiment had touched, including:

- `src/res/styles/_required.scss`, `_custom.scss` — pink `$primary: #e30048`
  palette restored
- `src/res/common.json` — original security-background pastels restored
- `src/content-scripts/{gmailIntegration.js,gmailIntegration.css,encryptFrame.js,encryptFrame.css,extractFrame.css}`
  — original pink Gmail/webmail buttons restored
- `src/app/settings/SecurityBackground.scss`, `src/app/keyring/KeyringSetup.scss`
- `src/img/*.svg`, `src/img/Mailvelope/keyring_main.svg` — original pink
  accents restored
- `Gruntfile.js`, `locales/en/messages.json`, `locales/vi/messages.json`
  (footer wording back to the v0.1.2 text)

Kept (were part of v0.1.2, not the theme): product name "Secure Mail",
bilingual EN/VI locales, custom envelope+padlock icon, "Copyright © Tracy
Tran" footer line, internal docs, admin/public-key workflow, non-commercial
attribution, all legal notices.

## Release

Restored build packaged as `releases/secure-mail-v0.1.3-restored-pink/`
(+ `.zip`). Extension content is functionally identical to v0.1.2.
