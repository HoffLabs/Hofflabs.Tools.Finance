// One-shot password reset helper.
// Generates a strong password meeting the app policy and prints
// JSON: { "password": "...", "hash": "$argon2id$..." }
//
// argon2 params must match src/lib/crypto/password.ts.
const crypto = require('crypto');
const argon2 = require('argon2');

function pick(set, n, rnd) {
  let out = '';
  for (let i = 0; i < n; i++) out += set[rnd() % set.length];
  return out;
}

function shuffle(s, rnd) {
  const a = s.split('');
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd() % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.join('');
}

function rndInt() {
  // 32-bit unsigned int from secure RNG.
  return crypto.randomBytes(4).readUInt32BE(0);
}

function genPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const symbol = '!@#$%^&*()-_=+[]{};:,.?';
  // 4 mandatory category chars, plus 14 from full set => 18 chars.
  const all = upper + lower + digit + symbol;
  const seed =
    pick(upper, 2, rndInt) +
    pick(lower, 2, rndInt) +
    pick(digit, 2, rndInt) +
    pick(symbol, 2, rndInt) +
    pick(all, 10, rndInt);
  return shuffle(seed, rndInt);
}

(async () => {
  const password = genPassword();
  const hash = await argon2.hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
    type: argon2.argon2id,
  });
  // Sanity self-verify.
  const ok = await argon2.verify(hash, password);
  process.stdout.write(JSON.stringify({ password, hash, verify: ok }) + '\n');
})().catch((e) => {
  process.stderr.write('ERR: ' + (e && e.message) + '\n');
  process.exitCode = 1;
});
