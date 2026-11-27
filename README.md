# Spoiler Shield

A Chrome extension that hides YouTube comments by default, so you can watch sports replays and highlights without the result being given away.

- Domain language: [GLOSSARY.md](./GLOSSARY.md)
- Decisions: [docs/adr/](./docs/adr/)

## Development

Needs Node >= 22.22.2.

```sh
npm install && npx playwright install chromium
npm test            # unit tests
npm run test:e2e    # browser tests against live YouTube
npm run build       # then load dist/ unpacked in Chrome
npm run recon       # list YouTube's current comment elements after a layout change
npm run icons       # regenerate icons/
npm run package     # build and zip dist/ into spoiler-shield.zip
```

Releasing: [docs/release-checklist.md](./docs/release-checklist.md) · Privacy: [docs/privacy.md](./docs/privacy.md)

## License

[MIT](./LICENSE). The agent skills in `.agents/skills/` come from [mattpocock/skills](https://github.com/mattpocock/skills) and are under that project's MIT license ([.agents/skills/LICENSE](./.agents/skills/LICENSE)).
