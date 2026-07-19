# Keyforge

A password and passphrase generator that runs entirely in your browser.

**Live app: https://ultra-madness.github.io/keyforge/**

## What it does

- Random passwords, 4-72 characters, with per-character-type rules
- Diceware-style passphrases from a 1,396-word list
- Live strength meter showing real entropy in bits and an offline-crack-time estimate
- Options for excluding look-alike characters, banning specific characters, forcing one of every type, and forbidding repeats
- Session history, one-click copy, light and dark themes
- Installable as a PWA and fully usable offline

## Privacy

Nothing you generate leaves your device. There are no network requests, no analytics, and no third-party assets. Passwords are held in memory only and are never written to storage; only your settings are remembered.

## Randomness

Characters and words come from crypto.getRandomValues, sampled with rejection sampling so there is no modulo bias, and shuffled with Fisher-Yates. The strength meter reports true entropy from the size of the character pool you selected rather than a heuristic score.

## Files

- index.html - the whole app: markup, styles, and logic in one file, no build step and no dependencies
- sw.js - a small service worker that caches the app shell for offline use
