/**
 * Jest's node test environment does not expose globalThis.crypto, so the core's
 * capability probe correctly refuses to boot. Inject Node's real WebCrypto —
 * the same API surface the Android WebView provides — so the node bundle
 * exercises the production code path rather than a stub.
 */
const {webcrypto} = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
