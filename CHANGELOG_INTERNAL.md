# Changelog — Secure Mail (internal)

## v0.1.3 — 2026-07-10 (approved, tag `secure-mail-v0.1.3`)

Experimental navy/teal visual theme tested and **rejected** after visual
review; the previous pink/red visual state (v0.1.2) was restored from tag
`before-theme-change` and approved as the final v0.1.3 release.

- The experiment lives on branch `theme-internal-palette-test` (not merged,
  kept for reference). Details: `BUILD_LOG.md`.
- Extension content is functionally identical to v0.1.2 (same name, locales,
  icon, copyright footer, permissions, crypto core).
- Release: `releases/secure-mail-v0.1.3-restored-pink/`.

## v0.1.2 — 2026-07-10

Product renamed to "Secure Mail"; proper bilingual locales; custom icon;
UI copyright line.

- Rename: all user-facing "Company Secure Mail" → "Secure Mail" (manifest
  name/title, app header, popup header, options title, docs). Repo/package
  name stays `securemail`; release folders now use the `secure-mail-` prefix.
- Bilingual UI restored: `locales/en` is proper English again (Secure Mail
  branding, upstream text as base) and `locales/vi` is Vietnamese. Language
  follows the browser UI language via `chrome.i18n` — Chrome in Vietnamese
  shows Vietnamese, anything else falls back to English (`default_locale: en`).
  No in-app language switcher (would require replacing the chrome.i18n l10n
  layer app-wide — too invasive). Internal safety warnings (never share the
  private key; admin manages public keys only; lost key without backup =
  unreadable old mail) now present in both languages.
- New icon: original envelope + padlock artwork (blue/amber) replaces the
  Mailvelope signet everywhere it was shown: toolbar/manifest icons (10 PNG
  sizes generated from `src/img/secure-mail/icon.svg`), app/popup headers,
  file panels, decrypt viewer, recovery sheet, favicon.
- Footer now shows "Copyright © Tracy Tran" (internal customization) plus a
  pointer to `THIRD_PARTY_NOTICES.md`; base-code copyright statements remain
  in `LICENSE`, `THIRD_PARTY_NOTICES.md`, and source headers.
- Removed a stray committed file (`e"`, accidental git-log dump).
- Unchanged: crypto core, OpenPGP.js, permissions/host permissions, keyserver
  defaults (still off), no telemetry/update server/remote services.

## v0.1.1 — 2026-07-10

Corrected branding + Vietnamese-first release; repo migrated to
https://github.com/imtoiteu/securemail (project name: securemail).

- UI de-branding: app header and popup now show signet icon + "Company Secure
  Mail" text (Mailvelope wordmark/seal removed); footer reduced to a legal
  notice line (© Mailvelope GmbH, AGPL-3.0 → `THIRD_PARTY_NOTICES.md`); all
  user-facing mailvelope.com links (FAQ, help, privacy) now point to the
  internal docs on the new repo; remaining English strings rebranded except
  real service/product names ("Mailvelope key server", "Mailvelope Business").
- Vietnamese by default: `chrome.i18n` follows the browser UI language, so the
  onboarding/key-generation/import/backup/action-menu/nav strings (~115 keys)
  are now Vietnamese in the `en` (default) locale, with `locales/vi` identical.
  Build ships only `en` + `vi` locales (other locales were still fully
  Mailvelope-branded).
- External key services off by default (internal public-key directory is the
  intended workflow): Mailvelope-key-server/keys.openpgp.org/WKD lookups
  disabled in `defaults.json`, key upload during generation unchecked by
  default (all remain user-configurable); "Mailvelope Demo" watch-list entry
  removed. No keyserver added, no upload performed.
- Armored output metadata now says "Company Secure Mail v6.3.0" /
  github.com/imtoiteu/securemail instead of Mailvelope (cosmetic armor
  headers only; no cryptographic change).
- Metadata: package.json name `securemail`, repository/homepage/bugs → new
  repo; manifest `homepage_url`/`author` updated (permissions unchanged);
  new `Readme.md` and `THIRD_PARTY_NOTICES.md`.
- Unchanged: crypto core, OpenPGP.js, permissions/host permissions, private
  key handling, analytics remain hard-disabled upstream (`ciActive = false`).

## v0.1.0 — 2026-07-10

First internal release. Based on Mailvelope v6.3.0 (frozen snapshot, commit `ffaa27af`).

- Branding: extension renamed to "Company Secure Mail" (en locale identity keys,
  manifest `short_name`); attribution line added to the app footer:
  "Based on Mailvelope and OpenPGP.js. Modified for internal non-commercial use."
  Description states internal, non-commercial use. AGPL and upstream copyright kept.
- New Vietnamese locale (`locales/vi/`, 50 most user-facing keys: name/description,
  onboarding, action menu, common buttons) with private-key safety warnings.
  Untranslated strings fall back to English.
- User guide: added warnings — only mail composed/sent through the extension's
  encryption window counts as encrypted; internal support is Gmail desktop only.
- Unchanged on purpose: crypto core, OpenPGP.js, permissions, provider watch list
  (Gmail already enabled by default), dependency versions, all other locales.
- Distribution: manual only — unzip and Load unpacked. No store, no CRX, no auto-update.

## Milestone 1 — 2026-07-10

- Frozen base recorded: Mailvelope v6.3.0, commit `ffaa27af` (`SOURCE_SNAPSHOT.md`).
- Original unmodified build verified on Node 24.15.0 / npm 11.12.1 (`BUILD_NOTES.md`).
- Internal Vietnamese docs added under `docs/internal/`, plus the public-key
  directory template and an example public-key bundle.
- `CUSTOMIZATION_PLAN.md` drafted. No `src/` changes.
