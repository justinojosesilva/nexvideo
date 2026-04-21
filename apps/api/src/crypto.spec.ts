/**
 * Unit tests for the AES-256-GCM token encryption utility.
 * Imported directly from source to avoid the dist alias.
 */
import { encryptToken, decryptToken } from '../../../packages/database/src/crypto';

const TEST_KEY = 'a'.repeat(64); // 32 bytes expressed as 64 hex chars

describe('encryptToken / decryptToken', () => {
  beforeAll(() => {
    process.env['ENCRYPTION_KEY'] = TEST_KEY;
  });

  afterAll(() => {
    delete process.env['ENCRYPTION_KEY'];
  });

  it('roundtrips a short access token', () => {
    const plain = 'ya29.short_access_token';
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('roundtrips a long refresh token', () => {
    const plain = '1//0e' + 'x'.repeat(200);
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plain = 'same_token';
    const c1 = encryptToken(plain);
    const c2 = encryptToken(plain);
    expect(c1).not.toBe(c2);
  });

  it('output is valid base64', () => {
    const c = encryptToken('token');
    expect(() => Buffer.from(c, 'base64')).not.toThrow();
    // Must have at least IV(12) + authTag(16) + 1 byte ciphertext
    expect(Buffer.from(c, 'base64').length).toBeGreaterThanOrEqual(29);
  });

  it('throws on tampered ciphertext (auth tag integrity check)', () => {
    const c = Buffer.from(encryptToken('token'), 'base64');
    c[c.length - 1] ^= 0xff; // corrupt last ciphertext byte
    expect(() => decryptToken(c.toString('base64'))).toThrow();
  });

  it('throws when ENCRYPTION_KEY is missing', () => {
    const saved = process.env['ENCRYPTION_KEY'];
    delete process.env['ENCRYPTION_KEY'];
    expect(() => encryptToken('token')).toThrow('ENCRYPTION_KEY');
    process.env['ENCRYPTION_KEY'] = saved;
  });

  it('throws when ENCRYPTION_KEY has wrong byte length', () => {
    process.env['ENCRYPTION_KEY'] = 'tooshort';
    expect(() => encryptToken('token')).toThrow('32 bytes');
    process.env['ENCRYPTION_KEY'] = TEST_KEY;
  });
});
