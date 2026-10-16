# clawsweeper.bot

The landing page for **[ClawSweeper](https://github.com/openclaw/clawsweeper)** —
the cleanup crab of OpenClaw. ClawSweeper scans every open issue and pull
request weekly, writes one durable review comment per item, and proposes a
close only when the evidence is strong.

→ <https://clawsweeper.bot>

## What's here

A single-page editorial site. Static HTML and CSS — no build step, no
JavaScript runtime, no analytics. Deploys directly to Vercel.

| File           | Purpose                                                  |
|----------------|----------------------------------------------------------|
| `index.html`   | Page markup                                              |
| `style.css`    | Abyssal archival theme, hairline rules, hero motion      |
| `vercel.json`  | Clean URLs, security headers, cache policy               |
| `package.json` | Local preview and workflow regression test scripts |

## Local preview

```bash
pnpm dev
# or
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## Checks

Run the dispatch concurrency regression tests with Node.js 22 or later:

```bash
pnpm test
# or
node --test --test-concurrency=2 tests/*.test.mjs
```

Comment commands have separate concurrency groups per comment, so issue or pull
request edits cannot cancel them. Edits to the same comment still supersede its
earlier dispatch; metadata edits continue to supersede earlier metadata runs.
Ignored bot label events also use a separate group. Marked maintainer opt-in
reminders are ignored even when they quote a command; ordinary comment commands
continue to use the shared router's existing command set.

Comment dispatch uses its own credential and continues if the optional token for
reactions and queued acknowledgements cannot be created.

## Deploy

This repo is wired to a Vercel project under the `amantus` team. Production
deploys flow from `main`; nothing else is needed.

```bash
vercel --prod --scope amantus
```

## Sibling repos

- **ClawSweeper** (the bot itself) — <https://github.com/openclaw/clawsweeper>
- **OpenClaw** — <https://github.com/openclaw/openclaw> · <https://openclaw.ai>
- **ClawHub** — <https://github.com/openclaw/clawhub> · <https://clawhub.ai>

## License

MIT — see [`LICENSE`](./LICENSE).
