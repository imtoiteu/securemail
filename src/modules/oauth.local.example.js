/**
 * Secure Mail — local OAuth client secret.
 *
 * Copy this file to `oauth.local.js` and paste the client secret (starts with GOCSPX) for the
 * Google Cloud OAuth client named in `manifest.json` (`oauth2.client_id`).
 * `oauth.local.js` is gitignored and must never be committed: this repository
 * is public, and GitHub secret scanning would notify Google, which then
 * auto-revokes the client and breaks Gmail sign-in for everyone.
 *
 * The value is not confidential in the cryptographic sense — it ships inside
 * the built extension and any user can read it. Google still requires it
 * because a `https://<id>.chromiumapp.org/` redirect can only be registered on
 * a "Web application" client, which Google treats as confidential. PKCE is the
 * control that actually protects this flow (see getAuthCode in gmail.js).
 *
 * Without this file the build fails loudly. That is deliberate.
 */
export const CLIENT_SECRET = 'PASTE-YOUR-CLIENT-SECRET-HERE';
