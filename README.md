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
| `package.json` | Tiny manifest with a `python3 -m http.server` dev script |

## Local preview

```bash
pnpm dev
# or
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

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
