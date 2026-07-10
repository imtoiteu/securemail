# Build Notes — Secure Mail

Base: Mailvelope, frozen snapshot. Provenance and policy: `SOURCE_SNAPSHOT.md`.
Last verified: 2026-07-10 (original unmodified build, no source changes).

## Toolchain

`package.json` `engines` requires **Node ≥ 24, npm ≥ 11**. There is no `.nvmrc`.
Verified with Node **v24.15.0** / npm **11.12.1**.

The system Node (v18) does not satisfy `engines` — select Node 24 first:

```sh
source ~/.nvm/nvm.sh && nvm use v24.15.0
```

## Build

```sh
npm ci             # exact lockfile install
npx grunt prod     # production build
npx grunt dist-cr  # package Chrome/Edge zip
```

`grunt-cli` is not needed globally — `grunt` is a devDependency, so `npx grunt` is used.

## Artifacts

| Path | Use |
|---|---|
| `build/chrome/` | Unpacked extension — the Load unpacked target |
| `dist/mailvelope.chrome.zip` | Packed zip for internal distribution |

`build/firefox/` is also produced by `grunt prod` but is out of scope for v1
(`grunt dist-ff` is not run).

## Decisions

- **Do not run `npm audit fix`.** `npm ci` reports advisories in dev dependencies.
  Fixing them mutates the frozen `package-lock.json` and would change the build inputs.
  Dependency versions stay frozen with the snapshot.
- **No global npm installs.** Keeps the build reproducible from the lockfile alone.
- **`build/` and `dist/` are disposable.** `grunt prod` starts with `clean`.

## Facts that shape customization

- Manifest V3, `minimum_chrome_version: 122`.
- The extension name and description resolve from locale messages
  (`__MSG_ext_name__` → `ext_name` in `locales/*/messages.json`), so rebranding
  needs no code change.
- Upstream ships 15 locales (ar, de, en, es, fr, he, id, ja, km, lt, my, pt_BR, ru, tr, uk)
  and **no Vietnamese** — a `locales/vi/` is purely additive.
- OpenPGP backend is OpenPGP.js `5.11.3`. **Do not modify the crypto core.**
- The manifest version comes from `package.json` via the `@@mvelo_version` placeholder.
