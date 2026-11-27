# Release checklist

Run before every release, with dist/ loaded unpacked in Chrome (chrome://extensions → Developer mode → Load unpacked).

## Automated
- [ ] npm run typecheck && npm test passes
- [ ] npm run test:e2e passes
- [ ] npm run recon: no new comment elements beyond src/core/selectors.ts

## Manual (watch for even a split second of comment text)
- [ ] Default, theatre and full-screen modes: comments Hidden, Placeholder shown
- [ ] Narrow window (under 1000px): no comment teaser visible
- [ ] Dark theme and light theme: Placeholder looks native and neutral
- [ ] Playlist autoplay into the next video after a Reveal: comments Hidden again
- [ ] A link to a specific comment (&lc=): highlighted comment Hidden
- [ ] A video with comments turned off: nothing odd
- [ ] A former live stream: Live Chat Replay works as normal
- [ ] Home page, search, Shorts and channel pages are unaffected
- [ ] chrome://extensions shows no errors for Spoiler Shield

## Package
- [ ] Bump version in manifest.json (and package.json)
- [ ] npm run package → upload spoiler-shield.zip; privacy answer: "does not collect user data", linking docs/privacy.md
