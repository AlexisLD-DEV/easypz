# EasyPZ

[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-22.23.2-339933.svg)](.nvmrc)

English quizzes for secondary-school students, with self-paced practice and live classroom sessions.

**Sites:** [easypz.fr](https://easypz.fr) · [easypz.study](https://easypz.study)

![Public quiz gallery](docs/screenshots/gallery-desktop.png)

## Features

- Public catalogue with search, question-type and level filters, and illustrated quiz covers.
- Self-paced practice, public quizzes and unlisted practice links.
- Teacher quiz editor, reusable question bank and draft duplication.
- Multiple choice, true/false, short answer, reformulation, fill-in-the-blank, matching and word-order questions.
- Live rooms with join codes, QR codes, teacher controls, student feedback and leaderboards.
- Session results, class analysis, CSV exports and optional email summaries.
- Question images/audio, teacher access administration and student-name moderation.
- French/English interface, theme preferences and responsive layouts.

### Screenshots

| View     | Desktop                                             | Mobile                                             |
| -------- | --------------------------------------------------- | -------------------------------------------------- |
| Gallery  | [Screenshot](docs/screenshots/gallery-desktop.png)  | [Screenshot](docs/screenshots/gallery-mobile.png)  |
| Practice | [Screenshot](docs/screenshots/practice-desktop.png) | [Screenshot](docs/screenshots/practice-mobile.png) |
| Join     | [Screenshot](docs/screenshots/join-desktop.png)     | [Screenshot](docs/screenshots/join-mobile.png)     |

## Stack

Versions below are the dependency baselines in `package.json`; `package-lock.json` pins installations.

| Component                      | Version / service             | Purpose                                       |
| ------------------------------ | ----------------------------- | --------------------------------------------- |
| Node.js                        | 22.23.2                       | Development and CI runtime                    |
| React / React DOM              | 19.2.6                        | Client interface                              |
| TypeScript                     | 6.0.3                         | Strict client and Worker types                |
| Vite                           | 8.0.13                        | Development server and build                  |
| Cloudflare Vite plugin         | 1.42.0                        | Local Worker integration                      |
| Wrangler                       | 4.102.0                       | Cloudflare resource and deployment CLI        |
| Cloudflare Workers             | Compatibility date 2026-05-18 | HTTP API and static assets                    |
| D1 / R2 / Durable Objects      | Managed services              | SQL persistence, media storage and live rooms |
| Zod                            | 4.4.3                         | Input validation                              |
| Motion / dotLottie React       | 12.40.0 / 0.19.4              | Client animation                              |
| Vitest / Testing Library React | 4.1.6 / 16.3.2                | Unit and component tests                      |
| Playwright                     | 1.62.1                        | Browser tests                                 |

## Prerequisites

- Git, Node.js from `.nvmrc` and npm (included with Node).
- A supported local Cloudflare development environment; local development uses emulated resources.
- A Cloudflare account with Workers, D1 and R2 access only for remote deployment.

## Local setup

```sh
git clone https://github.com/AlexisLD-DEV/easypz.git
cd easypz
nvm install
nvm use
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Open `http://127.0.0.1:5173`. Keep this hostname consistent with `APP_ORIGIN`.
The initial migration allowlists the example administrator `prof@example.org`; use that address
for local registration, or update the local `allowed_emails` record to match your local administrator.
`ADMIN_EMAIL` protects that address from removal; changing it alone does not create an allowlist entry.

The database starts without quiz content. For browser-test fixtures, stop the server, run
`npm run e2e:seed`, then restart it. Seeding is for disposable local data only.

## npm scripts

| Script                      | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `npm run dev`               | Run Vite and the local Worker on loopback             |
| `npm run build`             | Build client assets and Worker into `dist/`           |
| `npm run preview`           | Preview the built application                         |
| `npm run lint`              | Check TypeScript/TSX with ESLint; warnings fail       |
| `npm run typecheck`         | Run `tsc --noEmit`                                    |
| `npm run format -- <files>` | Format explicitly selected files with Prettier        |
| `npm test`                  | Run unit and component tests once                     |
| `npm run test:watch`        | Run Vitest in watch mode                              |
| `npm run e2e`               | Run the Playwright suite                              |
| `npm run e2e:seed`          | Seed disposable local browser-test fixtures           |
| `npm run smoke:live30`      | Exercise a live room with 30 simulated students       |
| `npm run db:migrate:local`  | Apply D1 migrations locally                           |
| `npm run db:migrate:remote` | Apply D1 migrations to the configured remote database |
| `npm run deploy`            | Deploy using Wrangler's active configuration          |

## Environment and bindings

Copy `.dev.vars.example` to the ignored `.dev.vars` for local development. Never commit real credentials,
personal addresses, database identifiers or account identifiers. Values are server-side; do not expose them through `VITE_*` variables.

| Example entry       | Meaning                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`       | Administrator address protected from allowlist removal; must match the seeded/configured admin       |
| `APP_ORIGIN`        | Trusted origin for state-changing requests; locally `http://127.0.0.1:5173`                          |
| `EMAIL_FROM`        | Sender identity for optional email summaries; production requires a verified sender                  |
| `RESEND_API_KEY`    | Optional email-service credential; the example value cannot send email                               |
| `LIVE_SESSION_ROOM` | Names the live-room resource in the example; runtime requires a Durable Object binding, not a string |
| `MEDIA_BUCKET`      | Names the media resource in the example; runtime requires an R2 binding, not a string                |

Remove the `LIVE_SESSION_ROOM` and `MEDIA_BUCKET` string entries from your local `.dev.vars`:
`wrangler.jsonc` declares the actual resource bindings. It also declares `DB` (D1) and `ASSETS` (static assets).
See [architecture](docs/architecture.md) for request flow and storage boundaries.

## Repository layout

| Path                 | Responsibility                                                                          |
| -------------------- | --------------------------------------------------------------------------------------- |
| `src/`               | React entry points, navigation, translations and feature-oriented UI/models             |
| `worker/`            | HTTP routes, authentication, validation, storage access and live-session Durable Object |
| `migrations/`        | Ordered D1 schema migrations                                                            |
| `public/`            | Static assets, local fonts and 16 bundled quiz-cover illustrations                      |
| `content/`           | Quiz-pack source data for explicit imports                                              |
| `scripts/`           | Seeding, import, screenshot, cover-validation and operational utilities                 |
| `tests/`             | Vitest unit and component regression tests                                              |
| `e2e/`               | Playwright desktop and mobile browser scenarios                                         |
| `docs/`              | Developer documentation and the canonical screenshot collection                         |
| `.github/workflows/` | Public CI checks without deployment credentials                                         |

## Tests

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
node scripts/check-quiz-covers.mjs
git diff --check
```

CI runs lint, type checking, Vitest, build and cover validation on pushes and pull requests.
Tests cover authentication, request origins, quiz validation, live scoring/state, view models and components.
The cover check verifies semantic assignments, deterministic fallback and image uniqueness.

Browser tests run separately:

```sh
npx playwright install --with-deps chromium
npm run e2e
```

Playwright starts the local stack, applies migrations and seeds fixtures when no server is reused.
An existing local server is reused unless `CI` is set; seed it explicitly first. Desktop and mobile
Chromium projects are configured. For Safari-engine coverage, install WebKit and set `E2E_WEBKIT=1`.
Browser tests are not part of the default CI job.

For the 30-student smoke test, run a local server and supply `SMOKE_BASE_URL`, `SMOKE_EMAIL` and
`SMOKE_PASSWORD` through your shell or secret store. It creates a quiz/session and checks results
and CSV output; use a disposable environment.

## Deployment

See [deployment](docs/deployment.md) for private configuration, provisioning, backup and migration order.
The checked-in Wrangler configuration contains example identifiers and is not a production deployment configuration.
No automatic deployment workflow is included. The production-health dispatch helper requires a separately
configured `production-health.yml` workflow and cannot run against this repository as supplied.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and the pull-request checklist.
Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md).
Report vulnerabilities using [SECURITY.md](SECURITY.md). Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

[ISC](LICENSE). Bundled fonts include their own license notices in `public/fonts/`.
