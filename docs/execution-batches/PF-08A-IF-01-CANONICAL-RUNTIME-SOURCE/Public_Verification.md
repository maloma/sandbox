# Public Verification — PF-08A-IF-01-CANONICAL-RUNTIME-SOURCE

**Status:** PASS  
**Verified At:** 2026-07-22T01:12:01Z  
**Public URL:** `https://maloma.github.io/sandbox/`  
**Expected Main Commit:** `078fff9a9a47b26fd6a4472fe107ba66e3cba926`  
**HTTP Status:** `200`  
**Attempts:** `1`  
**Response Bytes:** `110313`  
**Response SHA-256:** `387db605445d76aa1839979f478196dbe794ffb4a6a23b4eda707545ab8b7ea1`

## Assertions

- public root returned HTTP 200 — PASS;
- `canonical-runtime-source-v1` is present — PASS;
- old runtime `fetch('./src/familypilot.html` loader is absent — PASS;
- `document.write(source)` is absent — PASS;
- old `Загрузка FamilyPilot…` boot placeholder is absent — PASS.

## Verification Method

A one-time GitHub Actions job fetched the public root with a commit-specific cache-busting query, followed redirects, stored the response body, and evaluated the assertions above before writing this evidence.

## Result

The public FamilyPilot root serves the consolidated canonical runtime contract from the merged runtime commit.

# END OF FILE
