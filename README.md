# Spoiler Shield

A Chrome extension that hides YouTube comments by default, so you can watch sports replays and highlights without the result being given away.

- Domain language: [GLOSSARY.md](./GLOSSARY.md)
- Decisions: [docs/adr/](./docs/adr/)

## Development

- npm install && npx playwright install chromium
- npm test: unit tests · npm run test:e2e: browser tests against live YouTube
- npm run build → load dist/ unpacked in Chrome
- npm run recon: list YouTube's current comment elements after a layout change
- Releasing: [docs/release-checklist.md](./docs/release-checklist.md) · Privacy: [docs/privacy.md](./docs/privacy.md)
