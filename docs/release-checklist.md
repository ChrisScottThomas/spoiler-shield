# Release checklist

Run before every release, with `dist/` loaded unpacked in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Automated
- [ ] `npm run typecheck && npm test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run recon`: UNCOVERED is empty (or contains no comment text)

## Manual (watch for even a split second of comment text)
- [ ] Default, theatre and full-screen modes: comments Hidden, Placeholder shown
- [ ] Signed in to a Google account: comments Hidden, Placeholder shown
- [ ] Narrow window (the e2e test uses 600px): no comment teaser visible
- [ ] Comments side panel (narrow window → open comments): Hidden until Reveal
- [ ] Dark theme and light theme: Placeholder looks native and neutral
- [ ] Playlist autoplay into the next video after a Reveal: comments Hidden again
- [ ] A link to a specific comment (`&lc=`): highlighted comment Hidden
- [ ] A video with comments turned off: nothing odd
- [ ] A former live stream: Live Chat Replay works as normal
- [ ] Home page, search, Shorts and channel pages are unaffected
- [ ] `chrome://extensions` shows no errors for Spoiler Shield

## Store listing
- [ ] Single purpose: "Hides YouTube comments by default so sports replays and highlights aren't spoiled"
- [ ] `storage` permission justification: "remembers that the one-time explanation was seen"
- [ ] Host access justification: "runs only on www.youtube.com to hide comments"
- [ ] Data usage certification: "collects no user data"
- [ ] Privacy policy URL: https://github.com/ChrisScottThomas/spoiler-shield/blob/main/docs/privacy.md

## Package
- [ ] Bump version in `manifest.json` (and `package.json`)
- [ ] `npm run package` → upload `spoiler-shield.zip`
