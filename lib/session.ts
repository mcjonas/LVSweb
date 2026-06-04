/**
 * lib/session.ts
 *
 * HMAC-SHA256-signed session tokens for the admin dashboard cookie.
 * Fully compatible with Next.js Edge Runtime (uses Web Crypto API).
 *
 * Replaces the insecure plaintext `'authenticated'` constant.
 * The token is: `v1.<timestamp>.<nonce>.<hmac>` where the HMAC
 * covers the first three fields using SESSION_SECRET.
 *
 * Constant-time comparison is handled natively via Web Crypto.
 *
 * Required env var: SESSION_SECRET (≥32 random bytes, hex-encoded)
 */

const TOKEN_VERSION = 'v1';
// Tokens are valid for 7 days (matches the cookie maxAge)
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

// Setup Edge-compatible and Node-compatible Web Crypto
let webCrypto: Crypto;
if (typeof crypto !== 'undefined' && crypto.subtle) {
  webCrypto = crypto;
} else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
  webCrypto = (globalThis as any).crypto;
} else {
  // Use variable require reference to avoid static analysis Edge Runtime warnings
  const req = typeof require !== 'undefined' ? require : null;
  if (req) {
    webCrypto = req('crypto').webcrypto;
  } else {
    throw new Error('Web Crypto API is not supported in this environment.');
  }
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET env var is missing or too short (min 16 chars)');
  }
  return secret;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return webCrypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function sign(payload: string): Promise<string> {
  const secret = getSecret();
  const key = await getCryptoKey(secret);
  const data = encoder.encode(payload);
  const signature = await webCrypto.subtle.sign('HMAC', key, data);
  
  // Convert signature (ArrayBuffer) to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a new signed session token.
 * Format: `v1.<timestampMs>.<nonce>.<hmac>`
 */
export async function createSessionToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).slice(2);
  const payload = `${TOKEN_VERSION}.${timestamp}.${nonce}`;
  const hmac = await sign(payload);
  return `${payload}.${hmac}`;
}

/**
 * Verifies a session token.
 * Returns true if the token is valid, unexpired, and correctly signed.
 * Uses native Web Crypto constant-time comparison.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 4) return false;

    const [version, timestamp, nonce, providedHmac] = parts;

    // Version check
    if (version !== TOKEN_VERSION) return false;

    // Expiry check
    const ts = Number(timestamp);
    if (isNaN(ts) || Date.now() - ts > TOKEN_MAX_AGE_MS) return false;

    // HMAC verification (constant-time check done natively in Web Crypto)
    const secret = getSecret();
    const key = await getCryptoKey(secret);
    
    // Convert hex signature back to Uint8Array
    const sigBytes = new Uint8Array(
      providedHmac.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    const payload = `${version}.${timestamp}.${nonce}`;
    const data = encoder.encode(payload);
    
    return await webCrypto.subtle.verify('HMAC', key, sigBytes, data);
  } catch {
    return false;
  }
}
