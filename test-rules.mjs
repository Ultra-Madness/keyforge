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
const log = (m='') => writeSync(1, '[' + ((Date.now()-__t0)/1000).toFixed(1) + 's] ' + m + '\n');
console.log = log;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '   ' + extra : '')); };
const $ = (id) => d.getElementById(id);
const set = (id, v) => { const e = $(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; };

console.log('\n=== 13. Required-set sampler is uniform (chi-square vs brute force) ===');
{
  // Small enumerable case: length 3 from {a,b,c}, at least 2 from {a,b}
  const all = ['a','b','c'], S = ['a','b'], need = 2, L = 3;
  const valid = [];
  (function rec(s){ if (s.length===L){ if ([...s].filter(c=>S.includes(c)).length>=need) valid.push(s); return; }
                    for (const c of all) rec(s+c); })('');
  const M = 60000, counts = new Map(valid.map(v=>[v,0]));
  let invalid = 0;
  for (let i=0;i<M;i++){
    const s = kf.sampleWithRequired(all, S, need, L, false).join('');
    if (!counts.has(s)) invalid++; else counts.set(s, counts.get(s)+1);
  }
  ok('never emits a string violating the rule', invalid === 0, invalid + ' bad');
  ok('every valid string is reachable', [...counts.values()].every(v=>v>0));
  const exp = M/valid.length;
  const chi = [...counts.values()].reduce((a,v)=>a+(v-exp)**2/exp,0);
  // df=19 -> p=0.001 critical 43.8
  ok('uniform over all ' + valid.length + ' valid strings (df=19, X2 < 43.8)', chi < 43.8, 'X2=' + chi.toFixed(2));

  // the naive approach this replaced, to show the test can actually detect skew
  const naive = () => { const ch=[]; for(let i=0;i<need;i++) ch.push(kf.pick(S));
                        while(ch.length<L) ch.push(kf.pick(all)); return kf.shuffle(ch).join(''); };
  const nc = new Map(valid.map(v=>[v,0]));
  const NM = 30000;
  for (let i=0;i<NM;i++){ const s=naive(); if (nc.has(s)) nc.set(s, nc.get(s)+1); }
  const nexp = NM/valid.length;
  const nchi = [...nc.values()].reduce((a,v)=>a+(v-nexp)**2/nexp,0);
  ok('control: naive place-and-shuffle is detectably biased', nchi > 43.8, 'X2=' + nchi.toFixed(0));
}

console.log('\n=== 14. Required-set sampler, no-repeats variant ===');
{
  const all = ['a','b','c','d'], S = ['a','b'], need = 1, L = 3;
  const valid = [];
  (function rec(pre){ if (pre.length===L){ if (pre.filter(c=>S.includes(c)).length>=need) valid.push(pre.join('')); return; }
                      for (const c of all) if (!pre.includes(c)) rec([...pre,c]); })([]);
  const M = 25000, counts = new Map(valid.map(v=>[v,0]));
  let dupes = 0, invalid = 0;
  for (let i=0;i<M;i++){
    const arr = kf.sampleWithRequired(all, S, need, L, true);
    if (new Set(arr).size !== arr.length) dupes++;
    const s = arr.join('');
    if (!counts.has(s)) invalid++; else counts.set(s, counts.get(s)+1);
  }
  ok('no character ever repeats', dupes === 0);
  ok('never violates the required minimum', invalid === 0);
  const exp = M/valid.length, chi = [...counts.values()].reduce((a,v)=>a+(v-exp)**2/exp,0);
  const df = valid.length-1, crit = df + 4*Math.sqrt(2*df);
  ok('uniform over all ' + valid.length + ' valid strings', chi < crit, 'X2=' + chi.toFixed(1) + ' df=' + df);
}

console.log('\n=== 15. Entropy counting matches brute-force enumeration ===');
{
  // countWithMin against exhaustive enumeration over a tiny alphabet
  const cases = [[5,2,0,3,false],[5,2,1,3,false],[5,2,2,3,false],[5,3,2,4,false],
                 [5,2,1,3,true],[6,3,2,3,true],[4,2,2,3,true]];
  let allMatch = true, detail = '';
  for (const [nAll,nSet,need,len,uniq] of cases) {
    const alpha = Array.from({length:nAll},(_,i)=>i);
    const S = alpha.slice(0,nSet);
    let n = 0;
    (function rec(pre){
      if (pre.length===len){ if (pre.filter(c=>S.includes(c)).length>=need) n++; return; }
      for (const c of alpha){ if (uniq && pre.includes(c)) continue; rec([...pre,c]); }
    })([]);
    const got = kf.countWithMin(nAll,nSet,need,len,uniq);
    if (Math.abs(got-n) > 1e-6){ allMatch = false; detail += ` (${nAll},${nSet},${need},${len},${uniq}) got ${got} want ${n};`; }
  }
  ok('closed-form count equals enumeration on ' + cases.length + ' cases', allMatch, detail);
}

console.log('\n=== 16. Constraints reduce reported entropy ===');
{
  set('lower',true); set('upper',true); set('digit',true); set('symbol',true);
  set('noAmb',false); set('noRepeat',false); set('exclude',''); set('must',''); set('mustMin','1');
  set('everyType',false); set('len','12');
  const base = kf.entropy('x'.repeat(12));
  set('everyType',true);
  const withType = kf.entropy('x'.repeat(12));
  ok('"one of each type" now costs bits instead of being ignored', withType < base,
     base.toFixed(2) + ' -> ' + withType.toFixed(2));

  set('everyType',false); set('must','!@#$'); set('mustMin','1');
  const req1 = kf.entropy('x'.repeat(12));
  set('mustMin','3');
  const req3 = kf.entropy('x'.repeat(12));
  ok('requiring characters costs bits', req1 < base, base.toFixed(2) + ' -> ' + req1.toFixed(2));
  ok('requiring more costs more', req3 < req1, req1.toFixed(2) + ' -> ' + req3.toFixed(2));
  ok('cost is material, not cosmetic', base - req3 > 1, (base-req3).toFixed(2) + ' bits');
  set('must',''); set('mustMin','1');
}

console.log('\n=== 17. Required set: end-to-end through makePassword ===');
{
  set('lower',true); set('upper',true); set('digit',true); set('symbol',true);
  set('noAmb',false); set('noRepeat',false); set('everyType',false); set('exclude','');
  set('len','16'); set('must','!@#$'); set('mustMin','3');
  let bad = 0;
  for (let i=0;i<1200;i++){
    const s = kf.makePassword();
    if (!s || [...s].filter(c=>'!@#$'.includes(c)).length < 3) bad++;
  }
  ok('1200 passwords all contain at least 3 of !@#$', bad === 0, bad + ' violations');

  // excluded characters must never appear even when required
  set('exclude','!@'); 
  let leaked = 0;
  for (let i=0;i<400;i++){ const s = kf.makePassword(); if (s && /[!@]/.test(s)) leaked++; }
  ok('exclusion beats requirement (no excluded char sneaks in)', leaked === 0);
  ok('conflict is surfaced to the user', $('pwwarn').classList.contains('show') && /Cannot require/.test($('pwwarn').textContent));
  set('exclude','');

  // impossible ask: more required than length
  set('len','4'); set('must','!@#$'); set('mustMin','9');
  const s2 = kf.makePassword();
  ok('over-long requirement is clamped, not crashed', typeof s2 === 'string' && s2.length === 4);
  ok('clamping is explained', /using 4/.test($('pwwarn').textContent));

  // required set with no repeats
  set('len','8'); set('noRepeat',true); set('must','abc'); set('mustMin','3');
  let dup = 0, short = 0;
  for (let i=0;i<400;i++){ const s = kf.makePassword();
    if (new Set(s).size !== s.length) dup++;
    if ([...s].filter(c=>'abc'.includes(c)).length < 3) short++; }
  ok('no-repeats + required set holds both rules', dup === 0 && short === 0, dup + ' dupes, ' + short + ' short');
  set('noRepeat',false); set('must',''); set('mustMin','1'); set('len','20');
}

console.log('\n=== 18. Rule chips reflect what is actually in force ===');
{
  set('noAmb',true); set('exclude','xyz'); set('must','!@'); set('mustMin','2'); set('everyType',true);
  kf.makePassword(); w.document.getElementById('pw').textContent = 'x';
  // score() drives the chips; call through the public entropy path
  const chipText = () => [...d.querySelectorAll('#chips .chip')].map(c=>c.textContent).join(' | ');
  $('len').dispatchEvent(new w.Event('input'));
  const t = chipText();
  ok('chip shows the exclusion', /excludes/.test(t), t);
  ok('chip shows the requirement', /at least 2/.test(t));
  ok('chip shows look-alike rule', /look-alikes/.test(t));
  ok('chip reports the entropy cost', /rules cost/.test(t));
  set('noAmb',false); set('exclude',''); set('must',''); set('everyType',true);
}


console.log('\n' + '='.repeat(58));
console.log(`  ${pass} passed, ${fail} failed`);
console.log('='.repeat(58) + '\n');
process.exit(fail ? 1 : 0);
