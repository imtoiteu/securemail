# Secure Mail Mobile — Design

Date: 2026-09-04
Status: Approved
Scope: Android first; Gmail integration second; iOS later.

## 1. Context

`company-secure-mail` ships a desktop Chrome/Edge MV3 extension — a fork of
Mailvelope 6.3.0, released internally as Secure Mail v0.1.3 on branch
`internal-stable-v1`. It encrypts Gmail by injecting content scripts into the
Gmail web page.

That delivery mechanism does not exist on mobile: mobile browsers do not run
extensions. A mobile Secure Mail must therefore own its own screens.

The desktop extension is the stable reference implementation and is **read-only
for the entire duration of this work**.

## 2. Goals

1. An Android app that preserves as much Secure Mail functionality as the
   platform allows, reusing the audited cryptographic core unchanged.
2. An architecture in which Gmail integration (Phase 2) is an addition, not a
   rewrite.
3. iOS reachable later without re-architecting: shared code stays
   platform-neutral.
4. Zero modification to the desktop extension, demonstrable by a check that
   anyone can run.

## 3. Non-goals

- No modification of `mailvelope/**` — source, build output, manifest, config.
- No "Secure Vault" feature. The term appeared in the original request but
  matches nothing in the codebase; the user confirmed it was aspirational.
  Private keys are still encrypted at rest — that is baseline security, not a
  feature (§8).
- No Gmail inbox in Phase 1.
- No iOS project files in Phase 1.
- No key-sync protocol between desktop and mobile. Keys move by user-initiated
  import/export of existing formats.
- No telemetry, analytics, remote code loading, or keyserver. (`CLAUDE.md` hard
  rules; `analytics.js` is replaced by a no-op stub.)
- No Play Store publication. Internal distribution only.

## 4. Audit findings that drive the design

Measured against `mailvelope/src/`:

| Layer | Files | Chrome coupling | Verdict |
|---|---|---|---|
| `modules/` — PGP core, keyring, key storage, MIME, Gmail REST, WKD, pwd cache, prefs | 26 | 5 files, ~25 call sites | Reusable unmodified |
| `controller/` — orchestration per UI surface | 19 | 1 file | Replaced by RPC handlers |
| `lib/lib-mvelo.js` — storage/tabs/windows/offscreen | 1 | 31 call sites | The seam; replaced |
| `app/` — React 16 + reactstrap options page | 59 | via port messaging | UI not reusable |
| `components/` — editor, decrypt, genkey, backup… | 80 | via port messaging | UI not reusable |
| `content-scripts/` — Gmail DOM injection | 21 | total | No mobile equivalent |
| `client-API/` — page-facing API | 3 | total | No mobile equivalent |

The core's complete platform surface, verified by grep over `src/modules/*.js`:

- `mvelo.storage.get` / `set` / `remove`
- `mvelo.util.sanitizeHTML` / `text2autoLinkHtml` (DOMPurify)
- `mvelo.action.state` (toolbar badge)
- `chrome.storage.session` (prefs.js, keyring.js, pwdCache.js)
- `chrome.alarms` (pwdCache.js)
- `chrome.dns` (wkdLocate.js, already guarded by a `typeof` check)
- `chrome.identity`, `chrome.runtime.getManifest()` (gmail.js — Phase 2 only)

The core never calls `mvelo.tabs` or `mvelo.windows`.

Crypto is pure JS: `openpgp` 5.11.3 plus `crypto.getRandomValues`. Gmail
integration is plain `fetch` against `googleapis.com`.

Two facts constrain Phase 2:

- `modules/gmail.js:13` contains a committed `CLIENT_SECRET` for a Google *web*
  OAuth client. It must not be reused on mobile. Phase 2 provisions a separate
  Android client using PKCE with no secret.
- `modules/gmail.js` otherwise needs no change.

## 5. Architecture

Chosen approach: **native React Native UI + WebView-hosted crypto core.**

```
Android app (Expo / React Native)

  Native UI  ──── typed RPC bridge ────  Hidden WebView "core host"
  (screens)                              unmodified mailvelope/src/modules/*
      │                                  openpgp 5.11.3, DOMPurify
      │ storage RPC
      ▼
  Encrypted store (Android Keystore-sealed)
```

Rationale. `CLAUDE.md` states preserving cryptographic behaviour as a hard rule.
The Android System WebView is Chromium — the same engine family the desktop
extension runs in — so Web Crypto, Web Streams and DOMPurify behave identically
and require no polyfill stack under the crypto core. Running openpgp on RN's
Hermes engine would require polyfilling `crypto.getRandomValues`, Web Streams,
`TextEncoder` and `Buffer`, which cannot be validated without device testing.
Native rendering is kept for the UI, satisfying the requirement that the mobile
UX not be a shrunken desktop UI.

The UI↔core split also mirrors the extension's existing UI↔background port
messaging, so the reused code sits in a familiar shape.

## 6. Repository layout

All new work is confined to `mobile/`.

```
mobile/
├─ README.md
├─ package.json                    npm workspaces root
├─ scripts/
│  └─ verify-desktop-untouched.sh  isolation check (§7)
├─ docs/
│  ├─ specs/                       this document
│  └─ internal/                    Vietnamese install/QA docs
├─ packages/
│  ├─ bridge/                      typed RPC contract, shared by both sides
│  │  └─ src/{methods.ts,envelope.ts,errors.ts}
│  └─ core-host/                   WebView payload
│     ├─ src/
│     │  ├─ index.js               boot + RPC dispatcher
│     │  ├─ handlers/{keyring,crypto,backup,prefs,app}.js
│     │  └─ shims/{chrome.js,lib-mvelo.js,l10n.js,analytics.js}
│     ├─ webpack.config.js         NormalModuleReplacementPlugin swaps
│     └─ dist/core.html            build output, consumed by the app
└─ app/                            Expo React Native app
   ├─ app.config.ts
   ├─ src/
   │  ├─ core/                     CoreClient (WebView host + RPC client)
   │  ├─ storage/                  DEK custody + blob store
   │  ├─ screens/ components/ theme/ i18n/
   │  └─ navigation/
   └─ android/                     generated by `expo prebuild`
```

## 7. Isolation guarantee

The desktop tree is consumed **read-only at build time only**. `core-host`'s
webpack config resolves `../../../mailvelope/src/modules/*` and replaces exactly
four modules via `NormalModuleReplacementPlugin`:

| Desktop module | Replaced by | Why |
|---|---|---|
| `lib/lib-mvelo.js` | `shims/lib-mvelo.js` | storage/tabs/windows/offscreen are Chrome-specific |
| `lib/l10n.js` | `shims/l10n.js` | `chrome.i18n` unavailable |
| `lib/analytics.js` | `shims/analytics.js` | hard no-op; no telemetry, ever |
| `lib/browser.runtime.js` | `shims/browser.runtime.js` | exports `gpgme = null` and a no-op `initNativeMessaging`. Without this, `keyring.init()` reaches `gpgmejs.init({timeout: 10000})` on first load and stalls ~10s waiting for a native host that cannot exist on Android; it also drags the whole `gpgmejs` dependency into the bundle. GnuPG code paths stay present but inert. |

No process writes to `mailvelope/`. `mobile/scripts/verify-desktop-untouched.sh`
asserts:

1. `git -C "$REPO_ROOT/mailvelope" status --porcelain` is empty, where
   `REPO_ROOT` resolves to the parent of `mobile/` — not to the script's own
   directory.
2. `git -C "$REPO_ROOT/mailvelope" rev-parse HEAD` equals the commit recorded
   in `mobile/.desktop-baseline` (currently `a2bf3bca`, branch
   `internal-stable-v1`).
3. Each of the 161 `extension/` entries in
   `mailvelope/releases/secure-mail-v0.1.3-restored-pink/SHA256SUMS.txt` still
   matches the corresponding file under `mailvelope/build/chrome/`. The two
   trees are byte-identical today (`diff -rq` clean, spot-checked against
   `manifest.json`), so this is an exact check, not an approximation.

The script runs in CI and is documented as a pre-flight for any mobile work.

## 8. Storage, key custody and session model

Android `SecureStore` items are capped near 2 KB, too small for armored PGP
keys. Envelope encryption with a split of duties:

```
Android Keystore ── seals ──► DEK (256-bit) in SecureStore
                                   │ released on biometric/PIN unlock
                                   ▼ over bridge
                    Core host: AES-256-GCM via real WebCrypto
                                   │ opaque ciphertext
                                   ▼
                    App-private file store (native = dumb blob store)
```

Native holds key custody; the WebView performs all cryptography. This avoids a
second AES implementation and keeps plaintext key material out of native code.

Layering. An OpenPGP secret key is already passphrase-encrypted by openpgp.js
exactly as on desktop. The file-level AES-GCM is additive, so device compromise
does not reduce protection to a single secret.

Session. `chrome.storage.session` is an in-memory `Map` in the core host, so
cached passphrases never touch disk — faithful to MV3 semantics. Relock wipes
that `Map` and the DEK from WebView memory. Relock triggers:

- `pwdCache` timeout (existing desktop preference, honoured)
- app backgrounded beyond a configurable grace period
- explicit lock action

`FLAG_SECURE` is set on key and passphrase screens, blocking screenshots and the
recents thumbnail. `android:allowBackup="false"` prevents ADB and cloud backup
from exfiltrating the store.

Key movement. Import accepts the desktop's existing formats: armored `.asc` and
the encrypted backup block produced by `createPrivateKeyBackup`. Export and
backup leave only through the OS share sheet, user-initiated. Nothing is
uploaded automatically; no key material leaves the device on its own.

Out of threat model: rooted or compromised device, hostile OS. This matches the
desktop extension's posture against a compromised browser.

## 9. Bridge contract

Envelope, promise-correlated by `id`, with per-call timeouts:

```
{ id, method, params }  →  { id, ok: true,  result }
                           { id, ok: false, error: { name, message, code } }
```

### App → Core (Phase 1)

| Method | Params | Returns |
|---|---|---|
| `app.getVersion` | — | `{version, coreVersion}` |
| `app.unlock` | `{dek}` | `{ok}` |
| `app.lock` | — | `{ok}` |
| `keyring.getKeyData` | `{keyringId, allUsers}` | key summaries |
| `keyring.getKeyDetails` | `{keyringId, fingerprint}` | detail record |
| `keyring.generateKey` | `{keyAlgo, numBits, userIds, passphrase, keyExpirationTime}` | `{fingerprint}` |
| `keyring.importKeys` | `{keyringId, keys[]}` | per-key result |
| `keyring.removeKey` | `{keyringId, fingerprint, type}` | `{ok}` |
| `keyring.exportKeys` | `{keyringId, fingerprints, allKeys, publicOnly}` | armored |
| `keyring.setDefaultKey` | `{keyringId, fingerprint}` | `{ok}` |
| `keyring.getDefaultKeyFpr` | `{keyringId}` | fingerprint |
| `crypto.encryptMessage` | `{data, keyringId, encryptionKeyFprs, signingKeyFpr}` | armored |
| `crypto.decryptMessage` | `{armored, keyringId, senderAddress}` | `{data, signatures}` |
| `crypto.signMessage` | `{data, keyringId, signingKeyFpr}` | armored |
| `crypto.verifyMessage` | `{armored, keyringId, senderAddress}` | `{data, signatures}` |
| `crypto.encryptFile` | `{plainFile, keyringId, encryptionKeyFprs, signingKeyFpr, armor}` | encrypted file |
| `crypto.decryptFile` | `{encryptedFile}` | plain file |
| `backup.create` | `{keyringId, defaultKeyFpr, keyPwd}` | `{backup, code}` |
| `backup.restore` | `{armoredBlock, code}` | `{key}` |
| `prefs.get` | — | prefs object |
| `prefs.set` | `{prefs}` | `{ok}` |

Each handler is a thin call into an unmodified desktop export — `pgpModel.*`,
`keyring.*`, `KeyringBase.*`. The handler layer is the only new code on the core
side; the crypto path is identical to desktop.

### Core → App

| Method | Purpose |
|---|---|
| `storage.get` / `set` / `remove` | backs `chrome.storage.local` |
| `pwd.request` | core needs a passphrase; native presents the unlock sheet |
| `log.uiLog` | surfaces `uiLog.js` entries to the security log screen |
| `identity.authorize` | Phase 2 only — AppAuth PKCE |

### Shims

- `chrome.storage.local` → `storage.*` RPC
- `chrome.storage.session` → in-memory `Map`, wiped on relock
- `chrome.alarms` → timers, for `pwdCache` timeout
- `chrome.runtime.getManifest()` → static object from `app.config.ts`
- `chrome.identity` → Phase 2 bridge to AppAuth
- `lib-mvelo`: `storage` via the above; `util.sanitizeHTML` calls DOMPurify
  directly against the WebView's real DOM, eliminating the `chrome.offscreen`
  document entirely; `action.state` no-ops; `tabs` and `windows` throw if
  reached (verified unreachable from `modules/`)
- `l10n` → `locales/{en,vi}/messages.json`
- `analytics` → no-op stub
- `browser.runtime` → `gpgme = null`, no-op native messaging (see §7)

### WebView hardening

Loaded from a bundled asset, never remote. CSP meta mirrors the extension's
`extension_pages` policy. **Phase 1 denies all network access in the core
host** — openpgp requires none, and v0.1.1 already disabled keyserver and WKD
lookups by default. Phase 2 opens exactly `https://www.googleapis.com`.

## 10. UI

Bottom tabs, stacked screens, bottom sheets for actions. Phase 2 inserts `Mail`
as the first tab; nothing else moves.

```
Phase 1:      Crypto    Keys    Settings
Phase 2:  Mail    Crypto    Keys    Settings
```

| Flow | Screens |
|---|---|
| First run | Unlock gate → onboarding: generate or import |
| Generate key | name/email → passphrase → advanced (algo, size, expiry) → progress → recovery sheet |
| Crypto | Decrypt (paste / shared-in) · Encrypt (compose → recipient picker → output) · Files |
| Keys | list → detail (users, fingerprint, validity, expiry) → export / set default / delete / backup |
| Settings | general · security (cache timeout, relock grace) · about and licence · language |

Design rules: minimum 48dp touch targets, one primary action per screen, no
dense tables, destructive actions confirmed in a sheet. Visual identity keeps
the approved v0.1.3 palette (`$primary: #e30048`) and the envelope-and-padlock
icon, recoloured for Material surfaces rather than porting the Bootstrap layout.

Android intent filters give Phase 1 a real Gmail workflow before Phase 2 exists:

- `ACTION_SEND` `text/plain` → decrypt screen
- `ACTION_SEND` file → file decrypt
- ciphertext shared back out to the Gmail app

i18n reuses `mailvelope/locales/{en,vi}/messages.json` read-only, preserving the
existing bilingual coverage with no retranslation. Language follows the device
locale with an in-app override.

## 11. Phase 2 — Gmail integration (designed, not built)

Additive only:

- New RPCs `gmail.listThreads`, `gmail.getMessage`, `gmail.sendMessage`,
  `gmail.getAttachment`, reusing `modules/gmail.js` unchanged.
- `identity.authorize` shim routes `getAuthToken` / `getAuthCode` to AppAuth.
- A **new Android OAuth client** using PKCE with no client secret. The desktop
  web client and its committed `CLIENT_SECRET` are not reused.
- New screens: Mail tab, thread list, message view with auto-decrypt, compose
  with encrypt-and-send.
- Core host network policy widens to `https://www.googleapis.com` only.

No Phase 1 component changes shape to accommodate this.

## 12. Error handling

Reuse `MvError` from `lib/util.js` and `pgpModel.noKeyFoundError`. The bridge
serialises `{name, message, code}`; the app maps codes to localised text.

| Class | Handling |
|---|---|
| No key found | Named recipients listed; offer import |
| Wrong passphrase | Retry in place, attempt counter, no key state change |
| Malformed armor | Explicit parse error, input preserved |
| Storage / unlock failure | Fail closed; never fall back to unencrypted storage |
| Bridge timeout / WebView crash | Respawn core host, retry idempotent calls once, then surface |

## 13. Testing

| Layer | What |
|---|---|
| Cross-build golden | Ciphertext from the desktop build decrypts on the mobile core and vice versa; desktop-exported `.asc` and backup blocks import cleanly. This is the evidence that cryptographic behaviour is preserved. |
| Unit (Node/Jest) | RPC handlers against the real core with in-memory storage: generate → encrypt → decrypt → verify; import; backup/restore; relock wipes session |
| Component | React Native Testing Library over screens and navigation |
| Isolation | `verify-desktop-untouched.sh` in CI |
| Manual | Vietnamese QA checklist mirroring `docs/internal/QA_CHECKLIST_VI.md` |

## 14. Build and release

```sh
npm ci                          # mobile/ workspace root
npm run build:core              # webpack → packages/core-host/dist/core.html
npx expo prebuild -p android    # generates app/android/
npm run android                 # dev build on device/emulator
cd app/android && ./gradlew assembleRelease
```

Constraint: the development machine for this work is Linux with no Android SDK
and no macOS/Xcode. Configuration, source, unit tests and the core bundle are
produced and verified here; **APK and IPA production happen on a machine with
the Android SDK / Xcode, or in CI.** A GitHub Actions workflow is provided.

Release artifacts follow the desktop convention: `mobile/releases/
secure-mail-mobile-vX.Y.Z/` with APK, `SHA256SUMS.txt`, changelog, licence and
Vietnamese install documentation.

## 15. Risks

| Risk | Mitigation |
|---|---|
| WebView version varies across Android devices | `minSdkVersion` 26 (Android 8). Android System WebView updates through Play independently of the OS, so capability is feature-detected rather than assumed: the core host probes `crypto.subtle`, `ReadableStream` and `TextEncoder` at boot and fails closed with a localised message |
| Bridge is a new trust boundary | Same-process only; core host never loads remote content; network denied in Phase 1 |
| DEK resides in WebView memory while unlocked | Bounded by relock; equivalent to the desktop extension holding keys in memory |
| Large file encryption over the bridge | Chunked transfer with a size cap; files stream through the file store rather than the message channel |
| Desktop tree accidentally modified | `verify-desktop-untouched.sh` in CI and as a pre-flight |
| Cannot build binaries in this environment | Configs plus CI workflow delivered; build steps documented and run by the user |

## 16. Licence

The mobile app is a derivative work of Mailvelope: AGPL-3.0, with upstream
Mailvelope GmbH copyright, source headers and `THIRD_PARTY_NOTICES.md` carried
forward. Internal, non-commercial distribution only, consistent with
`CLAUDE.md`.

## 17. Deviations from project defaults

- `mailvelope/CLAUDE.md` lists "Mobile support" as out of scope for v1. This
  work is an explicit, user-authorised exception. That file is not edited.
- This spec lives in `mobile/docs/specs/` rather than a repository-root
  `docs/superpowers/specs/`, to keep every new file inside `mobile/`.
