const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('node:crypto');

function encryptionKey(secret = process.env.OUTBOX_ENCRYPTION_KEY) {
  if (!secret || secret.length < 32) throw new Error('OUTBOX_ENCRYPTION_KEY must contain at least 32 characters');
  return createHash('sha256').update(secret).digest();
}

function seal(value, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function open(sealed, secret) {
  const [version, iv, tag, ciphertext, extra] = String(sealed).split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext || extra) throw new Error('Encrypted value is invalid');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { seal, open };
