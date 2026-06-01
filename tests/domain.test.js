/* Plain-node tests for the durable domain spec. No framework, no build:
     node tests/domain.test.js
   Exit code is non-zero if anything fails, so it works in CI later too. */
const assert = require('assert');
const path = require('path');
const Domain = require(path.join(__dirname, '..', 'domain.js'));

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

/* ---- validateEntry ---- */
test('validateEntry normalizes a good row', () => {
  const e = Domain.validateEntry({ id: 7, weight: '92.4', date: '2026-05-06T07:18:17.816Z', notes: 'x' });
  ok(e !== null, 'should accept');
  ok(e.id === '7', 'id coerced to string');
  ok(e.weight === 92.4, 'weight coerced to number');
  ok(e.date === '2026-05-06T07:18:17.816Z', 'date normalized to ISO');
  ok(e.clothesWeight === null, 'missing clothesWeight -> null');
});
test('validateEntry rejects non-numeric weight', () => {
  ok(Domain.validateEntry({ weight: 'heavy', date: '2026-01-01' }) === null, 'NaN weight rejected');
  ok(Domain.validateEntry({ weight: null, date: '2026-01-01' }) === null, 'null weight rejected');
});
test('validateEntry rejects unparseable date', () => {
  ok(Domain.validateEntry({ weight: 90, date: 'not-a-date' }) === null, 'bad date rejected');
  ok(Domain.validateEntry({ weight: 90 }) === null, 'missing date rejected');
});
test('validateEntry rejects non-objects', () => {
  for (const junk of [null, undefined, 42, 'str', []]) {
    ok(Domain.validateEntry(junk) === null, `rejects ${JSON.stringify(junk)}`);
  }
});

/* ---- parseLog: fail-soft invariants ---- */
test('parseLog drops bad rows and counts them, never throws', () => {
  const raw = [
    { weight: 90, date: '2026-01-01' },
    { weight: 'x', date: '2026-01-02' },   // bad
    null,                                   // bad
    { weight: 91, date: 'nope' },           // bad
    { weight: 92, date: '2026-01-03' },
  ];
  const { entries, rejected } = Domain.parseLog(raw);
  ok(entries.length === 2, 'kept the 2 good rows');
  ok(rejected === 3, 'counted the 3 bad rows');
  // invariant: kept + rejected === input length (nothing silently vanishes)
  ok(entries.length + rejected === raw.length, 'kept + rejected == input');
});
test('parseLog tolerates non-array input', () => {
  for (const junk of [null, undefined, {}, 'str', 42]) {
    const r = Domain.parseLog(junk);
    ok(r.entries.length === 0 && r.rejected === 0, `safe on ${JSON.stringify(junk)}`);
  }
});

/* ---- sanityFlags ---- */
test('sanityFlags catches impossible weights', () => {
  const flags = Domain.sanityFlags([
    { id: 'a', weight: 5, date: '2026-01-01T00:00:00Z' },
    { id: 'b', weight: 2000, date: '2026-02-01T00:00:00Z' },
  ]);
  ok(flags.has('a') && flags.has('b'), 'both out-of-range entries flagged');
});
test('sanityFlags catches a large same-day swing', () => {
  const flags = Domain.sanityFlags([
    { id: 'a', weight: 90, date: '2026-01-01T06:00:00Z' },
    { id: 'b', weight: 96, date: '2026-01-01T18:00:00Z' },  // +6kg in 12h
  ]);
  ok(flags.has('b'), 'sudden swing flagged');
});
test('sanityFlags does NOT flag a gradual change over time', () => {
  const flags = Domain.sanityFlags([
    { id: 'a', weight: 82, date: '2025-06-10T00:00:00Z' },
    { id: 'b', weight: 94, date: '2025-07-01T00:00:00Z' },  // +12kg but over 21 days
  ]);
  ok(flags.size === 0, 'slow change is fine');
});

/* ---- regression anchor: the real seed data must be clean ---- */
test('real Adomas seed data produces zero sanity flags', () => {
  const root = {};
  // seed-adomas.js assigns to window.ADOMAS_SEED
  global.window = root;
  require(path.join(__dirname, '..', 'seed-adomas.js'));
  const seed = root.ADOMAS_SEED;
  ok(Array.isArray(seed) && seed.length > 0, 'seed loaded');
  const { entries, rejected } = Domain.parseLog(seed);
  ok(rejected === 0, 'every seed row is valid');
  const flags = Domain.sanityFlags(entries);
  ok(flags.size === 0, `no false positives on real data (got ${flags.size})`);
});

/* ---- validatePayload ---- */
test('validatePayload rejects junk and missing fields', () => {
  ok(!Domain.validatePayload(null).ok, 'null rejected');
  ok(!Domain.validatePayload({}).ok, 'missing trim_export rejected');
  ok(!Domain.validatePayload({ trim_export: 2 }).ok, 'missing user.email rejected');
});
test('validatePayload cleans the log fail-soft and reports counts', () => {
  const r = Domain.validatePayload({
    trim_export: 2, user: { email: 'a@b.c' },
    log: [{ weight: 90, date: '2026-01-01' }, { weight: 'x', date: 'y' }],
  });
  ok(r.ok, 'accepted');
  ok(r.payload.log.length === 1, 'kept 1 good row');
  ok(r.report.logKept === 1 && r.report.logRejected === 1, 'report counts correct');
});

/* ---- run ---- */
let failures = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (err) { failures++; console.error(`FAIL  ${name}\n      ${err.message}`); }
}
console.log(`\n${tests.length - failures}/${tests.length} tests passed, ${passed} assertions.`);
process.exit(failures ? 1 : 0);
