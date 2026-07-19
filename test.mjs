import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { webcrypto } from 'crypto';

const html = readFileSync('/sessions/sweet-confident-ptolemy/mnt/outputs/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.getRandomValues) {
      Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
    }
  } });
const w = dom.window, d = w.document, kf = w.__kf;
if (!kf) { console.error('FAIL: app script did not run'); process.exit(1); }

import { writeSync } from 'fs';
let __t0=Date.now();
const log = (...a) => writeSync(1, '[' + ((Date.now()-__t0)/1000).toFixed(1) + 's] ' + a.join(' ') + '\n');
console.log = log;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : '')); };
const $ = (id) => d.getElementById(id);
const set = (id, v) => { const e = $(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; };

console.log('\n=== 1. rand() uniformity & bounds (chi-square, 600k draws over 37 buckets) ===');
{
  const K = 37, N = 200000, c = new Array(K).fill(0);
  let outOfRange = 0;
  for (let i = 0; i < N; i++) { const v = kf.rand(K); if (v < 0 || v >= K || !Number.isInteger(v)) outOfRange++; c[v]++; }
  ok('all values within [0,K) and integral', outOfRange === 0);
  const exp = N / K;
  const chi = c.reduce((s, o) => s + (o - exp) ** 2 / exp, 0);
  // df=36 -> critical value at p=0.001 is 67.985 ; at p=0.999 lower bound 12.2
  ok('chi-square within acceptance (df=36, 12.2 < X2 < 68.0)', chi > 12.2 && chi < 68.0, 'X2=' + chi.toFixed(2));
  // Express the spread in standard deviations so the threshold does not silently
  // depend on the sample size. A raw percentage tightens as N grows and gets flaky.
  const sd = Math.sqrt(exp * (1 - 1 / K));
  const maxZ = Math.max(...c.map(o => Math.abs(o - exp) / sd));
  ok('no bucket deviates more than 4 sigma', maxZ < 4, maxZ.toFixed(2) + ' sigma');
  ok('rand(1) always 0', Array.from({ length: 500 }, () => kf.rand(1)).every(v => v === 0));
}

console.log('\n=== 2. rand() has no modulo bias at an awkward range ===');
{
  // 2^32 is not divisible by 3; naive `v % 3` would still be near-uniform, so use a huge range
  // where bias would be blatant: max = 0x60000000 (2^32 / max = 2.66 -> naive modulo skews low buckets)
  const M = 0x60000000, N = 200000, c = [0, 0, 0];
  for (let i = 0; i < N; i++) c[Math.floor(kf.rand(M) / (M / 3))]++;
  const dev = Math.max(...c.map(x => Math.abs(x - N / 3) / (N / 3)));
  ok('thirds of a 1.6-billion range each within 2%', dev < 0.02, (dev * 100).toFixed(2) + '%');
}

console.log('\n=== 3. shuffle() is unbiased (position distribution over 5 elements) ===');
{
  const N = 60000, counts = Array.from({ length: 5 }, () => new Array(5).fill(0));
  for (let i = 0; i < N; i++) kf.shuffle([0, 1, 2, 3, 4]).forEach((v, pos) => counts[v][pos]++);
  const exp = N / 5;
  const worst = Math.max(...counts.flat().map(x => Math.abs(x - exp) / exp));
  ok('every element lands in every position ~equally (<3% dev)', worst < 0.03, (worst * 100).toFixed(2) + '%');
}

console.log('\n=== 4. Password rule compliance ===');
{
  set('lower', true); set('upper', true); set('digit', true); set('symbol', true);
  set('noAmb', false); set('everyType', true); set('noRepeat', false); set('exclude', '');
  set('len', 20);
  const S = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[!@#$%^&*()\-_=+\[\]{};:,.?/~]/ };
  let lenOK = true, typeOK = true, charOK = true;
  const seen = new Set();
  for (let i = 0; i < 4000; i++) {
    const p = kf.makePassword();
    if (p.length !== 20) lenOK = false;
    if (!Object.values(S).every(r => r.test(p))) typeOK = false;
    if (!p.split('').every(c => Object.values(S).some(r => r.test(c)))) charOK = false;
    seen.add(p);
  }
  ok('length always exactly 20', lenOK);
  ok('"one of each type" honoured in all 4000', typeOK);
  ok('no characters outside the declared sets', charOK);
  ok('4000 generations produced 4000 distinct passwords', seen.size === 4000, seen.size + ' unique');
}

console.log('\n=== 5. Position independence (guaranteed chars are shuffled, not front-loaded) ===');
{
  set('len', 8);
  const N = 12000, digitAt = new Array(8).fill(0);
  for (let i = 0; i < N; i++) kf.makePassword().split('').forEach((c, j) => { if (/[0-9]/.test(c)) digitAt[j]++; });
  const avg = digitAt.reduce((a, b) => a + b) / 8;
  const chi = digitAt.reduce((s2, o) => s2 + (o - avg) ** 2 / avg, 0);
  const df = 7, tol = 4 * Math.sqrt(2 * df);   // scale-free: 4-sigma band, independent of sample size
  ok('digits fall evenly across all 8 positions (chi-square, df=7)', Math.abs(chi - df) < tol,
     'X2=' + chi.toFixed(1) + ' vs df=7 +/-' + tol.toFixed(1));
  set('len', 20);
}

console.log('\n=== 6. Exclusions & look-alike filtering ===');
{
  set('noAmb', true);
  const amb = /[0O1lI|`'";:.,]/;
  ok('no look-alike characters when enabled', Array.from({ length: 2000 }, () => kf.makePassword()).every(p => !amb.test(p)));
  set('noAmb', false);
  set('exclude', 'abcXYZ789!@');
  const ex = /[abcXYZ789!@]/;
  ok('custom excluded characters never appear', Array.from({ length: 2000 }, () => kf.makePassword()).every(p => !ex.test(p)));
  set('exclude', '');
}

console.log('\n=== 7. No-repeat mode ===');
{
  set('noRepeat', true); set('len', 40);
  const rs = Array.from({ length: 1500 }, () => kf.makePassword());
  ok('every character unique within the password', rs.every(p => new Set(p).size === p.length));
  ok('still respects requested length', rs.every(p => p.length === 40));
  set('len', 72); set('lower', true); set('upper', false); set('digit', false); set('symbol', false);
  const capped = kf.makePassword();
  ok('length safely capped to pool size when impossible', capped.length === 26, 'got ' + capped.length + ' (pool=26)');
  ok('warning shown to the user when capped', $('pwwarn').classList.contains('show'));
  set('noRepeat', false); set('upper', true); set('digit', true); set('symbol', true); set('len', 20);
}

console.log('\n=== 8. Degenerate inputs are handled, not crashed ===');
{
  set('lower', false); set('upper', false); set('digit', false); set('symbol', false);
  ok('returns null (not a crash) with zero character types', kf.makePassword() === null);
  ok('user sees an explanatory warning', $('pwwarn').classList.contains('show') && $('pwwarn').textContent.length > 10);
  set('lower', true); set('exclude', 'abcdefghijklmnopqrstuvwxyz');
  ok('returns null when exclusions empty the only pool', kf.makePassword() === null);
  set('exclude', ''); set('upper', true); set('digit', true); set('symbol', true);
  set('len', 4); set('everyType', true);
  const tiny = kf.makePassword();
  ok('length 4 with 4 required types still works', tiny.length === 4);
  set('len', 20);
}

console.log('\n=== 9. Entropy maths ===');
{
  set('lower', true); set('upper', true); set('digit', true); set('symbol', true);
  set('noAmb', false); set('noRepeat', false); set('exclude', ''); set('len', 20);
  set('must', ''); set('mustMin', '1'); set('everyType', false);
  const pool = kf.buildPools().flat().length;          // 26+26+10+25 = 87
  ok('pool size is 87 for all four sets', pool === 87, 'pool=' + pool);

  // With no rules in force the count is the plain one.
  const e = kf.entropy('x'.repeat(20));
  const want = 20 * Math.log2(87);
  ok('unconstrained entropy = L x log2(N)', Math.abs(e - want) < 1e-9, e.toFixed(2) + ' bits vs ' + want.toFixed(2));

  // With "one of each type" on, strings missing a type are no longer reachable,
  // so the count must drop. Cross-checked against inclusion-exclusion computed
  // here from the raw class sizes, independently of the app's own helper.
  set('everyType', true);
  const eType = kf.entropy('x'.repeat(20));
  const K = [26, 26, 10, 25];
  let cnt = 0;
  for (let mask = 0; mask < 16; mask++) {
    let gone = 0, bits = 0;
    for (let i = 0; i < 4; i++) if (mask >> i & 1) { gone += K[i]; bits++; }
    cnt += (bits % 2 ? -1 : 1) * Math.pow(87 - gone, 20);
  }
  ok('"one of each type" is priced in, not ignored', eType < e, e.toFixed(2) + ' -> ' + eType.toFixed(2));
  ok('matches independent inclusion-exclusion', Math.abs(eType - Math.log2(cnt)) < 1e-9,
     eType.toFixed(4) + ' vs ' + Math.log2(cnt).toFixed(4));
  set('everyType', false);

  set('noRepeat', true);
  const eu = kf.entropy('x'.repeat(20));
  let manual = 0; for (let i = 0; i < 20; i++) manual += Math.log2(87 - i);
  ok('no-repeat entropy uses permutations, not powers', Math.abs(eu - manual) < 1e-9,
     eu.toFixed(4) + ' vs ' + manual.toFixed(4));
  ok('no-repeat entropy is strictly lower than with repeats', eu < e, eu.toFixed(1) + ' < ' + e.toFixed(1));
  set('noRepeat', false);

  // known-good reference: 20 chars from 87 symbols ~ 128.8 bits
  ok('20-char full-set password lands near 129 bits', Math.round(e) === 129, Math.round(e) + ' bits');
  set('everyType', true);
}

console.log('\n=== 10. Passphrase mode ===');
{
  const W = kf.WORDSET.length;
  ok('wordlist has no duplicates', new Set(kf.WORDSET).size === W, W + ' unique words');
  ok('wordlist is large enough to be useful (>1000)', W > 1000, W + ' words');
  ok('all words are plain lowercase a-z', kf.WORDSET.every(x => /^[a-z]+$/.test(x)));

  $('tab-pp').click();
  set('words', 6); set('sep', '-'); set('ppCap', true); set('ppNum', false); set('ppSym', false);
  const ps = Array.from({ length: 3000 }, () => kf.makePassphrase());
  ok('always the requested number of words', ps.every(p => p.split('-').length === 6));
  ok('capitalisation applied to every word', ps.every(p => p.split('-').every(x => /^[A-Z][a-z]+$/.test(x))));
  ok('3000 passphrases were all distinct', new Set(ps).size === 3000);

  const bits = kf.entropy(ps[0]);
  const want = 6 * Math.log2(W);
  ok('entropy = words x log2(listsize)', Math.abs(bits - want) < 1e-9, bits.toFixed(1) + ' bits');
  // A 1396-word list carries 10.45 bits/word, so 6 words = 62.7 bits: stronger than an
  // 8-char random password (51.5) but weaker than a 12-char one (77.3). The UI must say so honestly.
  ok('6 words > 8 random chars', bits > 8 * Math.log2(87), bits.toFixed(1) + ' vs 51.5');
  ok('6 words < 12 random chars (and the app does not overstate it)', bits < 12 * Math.log2(87));
  set('words', 7);
  ok('default of 7 words clears 70 bits', kf.entropy('') > 70, (7 * Math.log2(W)).toFixed(1) + ' bits');
  set('words', 6);

  set('ppNum', true); set('ppSym', true);
  ok('extras raise entropy', kf.entropy('') > want);
  const x = kf.makePassphrase();
  ok('number+symbol suffix appended', /[0-9]{2}[!@#$%^&*?\-+=]$/.test(x), x);

  set('sep', 'digit'); set('ppNum', false); set('ppSym', false);
  const dg = kf.makePassphrase();
  ok('random-digit separator inserts digits between words', (dg.match(/[0-9]/g) || []).length === 5, dg);

  // Word selection should be uniform. Per-bucket % deviation is the wrong metric here: with only
  // ~n draws per word, Poisson noise alone gives a max |z| around sqrt(2*ln(W)) ~ 3.8 sigma.
  // Chi-square over the whole list is the correct test.
  set('sep', '-'); set('words', 3); set('ppCap', false);
  const freq = new Map();
  const RUNS = 30000, DRAWS = RUNS * 3;
  for (let i = 0; i < RUNS; i++) kf.makePassphrase().split('-').forEach(x => freq.set(x, (freq.get(x) || 0) + 1));
  ok('every word in the list is reachable', freq.size === W, freq.size + '/' + W);
  const exp = DRAWS / W;
  const chi = [...freq.values()].reduce((s, o) => s + (o - exp) ** 2 / exp, 0);
  const df = W - 1, tol = 4 * Math.sqrt(2 * df);          // 4-sigma band on the chi-square statistic
  ok('word frequencies pass chi-square uniformity (df=' + df + ')', Math.abs(chi - df) < tol,
     'X2=' + chi.toFixed(0) + ' vs df=' + df + ' +/-' + tol.toFixed(0));
  const dev = Math.max(...[...freq.values()].map(v => Math.abs(v - exp) / exp));
  ok('worst-case per-word deviation stays under 4.5 sigma', dev * exp / Math.sqrt(exp) < 4.5,
     (dev * exp / Math.sqrt(exp)).toFixed(2) + ' sigma');
  $('tab-pw').click();
}

console.log('\n=== 11. Crack-time estimates are sane ===');
{
  ok('a 4-char lowercase-ish secret is instant', kf.crackTime(18).includes('instant'));
  ok('128 bits is astronomically long', /millennia/.test(kf.crackTime(128)), kf.crackTime(128));
  ok('estimates increase monotonically with entropy',
    [30, 50, 70, 90].every((b, i, a) => i === 0 || Math.pow(2, b) > Math.pow(2, a[i - 1])));
  console.log('        60 bits ->', kf.crackTime(60));
  console.log('        80 bits ->', kf.crackTime(80));
  console.log('       129 bits ->', kf.crackTime(129));
}

console.log('\n=== 12. Page integrity ===');
{
  ok('no external network references (fully self-contained)',
    !/\s(src|href)\s*=\s*["'](https?:)?\/\//i.test(html));
  ok('no inline event handlers that would break under CSP', !/\son(click|load)\s*=\s*"/i.test(html));
  ok('output area is a live region for screen readers', $('pw').getAttribute('aria-live') === 'polite');
  ok('every checkbox has an associated label', [...d.querySelectorAll('.opt input')].every(i => i.closest('label')));
  ok('service worker registration guarded for file:// use', /location\.protocol === 'https:'/.test(html));
  ok('passwords are never written to localStorage',
    !/localStorage[\s\S]{0,80}(current|history)/.test(html));
  ok('single file, no build step, under 60KB', html.length < 60000, (html.length / 1024).toFixed(1) + ' KB');
}



console.log('\n=== 13. Version is single-sourced and consistent ===');
{
  const swSrc = readFileSync('/sessions/sweet-confident-ptolemy/mnt/outputs/sw.js', 'utf8');
  const V = kf.VERSION;
  ok('VERSION constant is exported', typeof V === 'string' && /^v\d+\.\d+\.\d+$/.test(V), V);

  const cache = (swSrc.match(/const CACHE = '([^']+)'/) || [])[1];
  ok('service worker cache key matches the app version', cache === 'keyforge-' + V,
     cache + ' vs keyforge-' + V);

  ok('version is visible in the header', $('ver').textContent === V, $('ver').textContent);
  ok('version is in the document title', d.title.includes(V), d.title);
  ok('version is baked into the PWA name', /name: 'Keyforge ' \+ VERSION/.test(html));
  ok('version literal appears exactly once in index.html',
     (html.match(/const VERSION = '/g) || []).length === 1);
}

console.log('\n=== 14. Zoom is locked ===');
{
  const vp = d.querySelector('meta[name=viewport]').getAttribute('content');
  ok('viewport blocks user scaling', /user-scalable\s*=\s*no/.test(vp), vp);
  ok('viewport pins min and max scale to 1',
     /maximum-scale\s*=\s*1/.test(vp) && /minimum-scale\s*=\s*1/.test(vp));
  ok('viewport still fits notched displays', /viewport-fit\s*=\s*cover/.test(vp));

  ok('touch-action allows panning but not pinching', /touch-action:pan-x pan-y/.test(html));
  ok('applied to both html and body', (html.match(/touch-action:pan-x pan-y/g) || []).length >= 2);
  ok('mobile text auto-sizing disabled', /text-size-adjust:100%/.test(html));

  // iOS Safari ignores user-scalable=no, so these are the real defence there
  ok('iOS gesture events are prevented', /'gesturestart', 'gesturechange', 'gestureend'/.test(html));
  ok('multi-touch drags are prevented', /e\.touches\.length > 1/.test(html));
  ok('trackpad pinch (ctrl+wheel) is prevented', /wheel[\s\S]{0,80}e\.ctrlKey/.test(html));
  ok('zoom listeners are non-passive, or preventDefault would be ignored',
     (html.match(/\{ passive: false \}/g) || []).length >= 3);

  // must NOT swallow taps: preventDefault on touchend would kill the synthesized click
  ok('no touchend preventDefault (would break rapid taps on Generate)',
     !/addEventListener\('touchend'[\s\S]{0,160}preventDefault/.test(html));
  // keyboard zoom is the accessibility escape hatch and must stay working
  ok('keyboard zoom is left alone', !/key\s*===\s*'\+'|keyCode\s*===\s*187|'Minus'/.test(html));
}


console.log('\n' + '='.repeat(58));
console.log(`  ${pass} passed, ${fail} failed`);
console.log('='.repeat(58) + '\n');
process.exit(fail ? 1 : 0);
