# Secure Mail

Internal browser extension for OpenPGP end-to-end email encryption with Gmail
(Chrome/Edge desktop). Internal, non-commercial use only — not published to any
extension store.

Repository: https://github.com/imtoiteu/securemail

Copyright © Tracy Tran (internal customization). Base code copyright: see below.

Languages: English and Vietnamese (`_locales/en`, `_locales/vi`). The UI follows
the browser's interface language (`chrome.i18n`): Chrome in Vietnamese shows
Vietnamese, otherwise English is used. There is no in-app language switcher —
to change the language, change Chrome/Edge's UI language.

This project is based on Mailvelope and OpenPGP.js, modified for internal
non-commercial use. See `THIRD_PARTY_NOTICES.md` and `SOURCE_SNAPSHOT.md` for
provenance and `LICENSE` (AGPL-3.0) for license terms.

> This internal non-commercial project is based on Mailvelope and OpenPGP.js.
> Mailvelope copyright and AGPL-3.0 license notices are preserved.

### Git history note

This repository uses a fresh internal Git history starting from the approved
Secure Mail v0.1.3 snapshot; it does not carry the full upstream Mailvelope
commit history. This is a presentation choice for the internal repo only — it
does not change the source's origin. The full upstream provenance (base
version v6.3.0, commit `ffaa27af`) is recorded in `SOURCE_SNAPSHOT.md`, and
Mailvelope/OpenPGP.js copyright and license notices are preserved in
`LICENSE`, `THIRD_PARTY_NOTICES.md`, and the original source-file headers.

## Build

Requirements and exact commands: see `BUILD_NOTES.md`. Summary:

    nvm use v24.15.0   # Node >= 24, npm >= 11
    npm ci
    npx grunt prod     # -> build/chrome/
    npx grunt dist-cr  # -> dist/ zip

Load `build/chrome/` via Chrome/Edge → Extensions → Developer mode → Load unpacked.

## Documentation

Vietnamese install, user, admin and security docs: `docs/internal/`.
Release process and changelog: `docs/internal/ADMIN_RELEASE_GUIDE_VI.md`,
`CHANGELOG_INTERNAL.md`. Releases are distributed manually as zip files
(`releases/`, not committed).

## License

AGPL-3.0. Copyright of the base code: Mailvelope GmbH and contributors.
Upstream changelog preserved in `Changelog.md`.
