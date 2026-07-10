# Customization Plan — Secure Mail

Principle: smallest possible diff against the frozen snapshot (`SOURCE_SNAPSHOT.md`).
The original v6.3.0 build is verified working before any customization (`BUILD_NOTES.md`).

## In scope for v0.1.0, safest first

1. **Branding, locale-driven.** Set `ext_name` / `ext_description` in
   `locales/*/messages.json`; optionally `short_name` in `src/chrome/manifest.json`.
   Keep upstream icons. No code changes. Mailvelope attribution and AGPL notices stay intact.
2. **Vietnamese onboarding.** Add `locales/vi/messages.json` (additive — upstream has no `vi`),
   starting with onboarding and key-management strings; English remains the fallback.
   Text only, no UI restructuring.
3. **Gmail focus.** No code change. Gmail integration already exists upstream; documentation
   and QA target Gmail. Other providers stay enabled — removing them is diff and risk for no gain.
4. **Release packaging.** Assemble `releases/secure-mail-vX.Y.Z/` and its zip per
   `docs/internal/ADMIN_RELEASE_GUIDE_VI.md`.
5. **Public key directory.** Process and templates only (CSV + `.asc` bundle). No keyserver,
   no server component, no code.

## Must not change

- **Crypto core**: OpenPGP.js usage, key generation, encrypt/decrypt, signing,
  passphrase handling, key storage.
- **Extension permissions** and host access in the manifest.
- **Dependency versions** — `package-lock.json` stays frozen.
- Private-key handling and its security warnings — never weakened.
- `LICENSE` (AGPL) and upstream copyright notices.
- No telemetry, analytics, remote code, or new network endpoints.
- No upstream sync. The snapshot stays at v6.3.0.

Anything touching `src/**/*.js` is out of scope for v0.1.0.

## Milestone 2 order

1. Rename via the `en` locale, rebuild, smoke-test.
2. Add `locales/vi/messages.json`, rebuild, QA.
3. Assemble `releases/company-secure-mail-v0.1.0/` with zip and `SHA256SUMS.txt`.
4. Full pass of `docs/internal/QA_CHECKLIST_VI.md` and `docs/internal/SECURITY_CHECKLIST_VI.md`.
