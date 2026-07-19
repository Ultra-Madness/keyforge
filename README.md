# Keyforge

A password and passphrase generator that runs entirely in your browser.

**Live app: https://ultra-madness.github.io/keyforge/**

## What it does

- Random passwords, 4-72 characters, with per-character-type rules
- Diceware-style passphrases from a 1,396-word list
- Live strength meter showing real entropy in bits and an offline-crack-time estimate
- Rules for the awkward cases: exclude look-alike characters, ban specific characters,
  require at least N characters from a set you define, force one of every type, forbid repeats
- Session history, one-click copy, light and dark themes
- Installable as a PWA and fully usable offline

## Privacy

Nothing you generate leaves your device. There are no network requests, no analytics, and no third-party assets. Passwords are held in memory only and are never written to storage; only your settings are remembered.

## Randomness

Characters and words come from crypto.getRandomValues, sampled with rejection sampling so there is no modulo bias, and shuffled with Fisher-Yates.

Constrained generation is the part that is easy to get quietly wrong. The obvious way to honour a rule like "at least 3 of !@#$" is to place three required characters, fill the rest, and shuffle - but that is not uniform, because it over-represents strings that happen to pick up extra required characters by chance. On a small enumerable case the skew is stark: the most likely output appears three times as often as the least likely. Keyforge instead draws the number of required characters from its true distribution first, then fills each part independently, which is uniform over exactly the strings the rule allows.

## Strength

The meter reports the number of passwords your settings can actually produce, counted with inclusion-exclusion, rather than length x log2(pool size). Every rule you add shrinks that number, so the bit count falls and the app shows you what the rules cost. This matters most for short passwords under strict rules, which is precisely where a naive formula flatters the result.

## Files

- index.html - the whole app: markup, styles, and logic in one file, no build step and no dependencies
- sw.js - a small service worker that caches the app shell for offline use
- test.mjs, test-rules.mjs - 76 assertions covering randomness, rules, and entropy maths (`npm i jsdom && node test.mjs`)
