# Contributing

## Development setup

Follow the [README setup](README.md#local-setup). Use `.nvmrc`, install with `npm ci`, and keep local
credentials in the ignored `.dev.vars`. Use disposable local D1/R2 data for tests, never production data.
For implementation boundaries, read [architecture](docs/architecture.md).

Discuss substantial behavior changes in an issue before implementation. Include the problem,
expected behavior and reproduction steps; do not include personal data or credentials.

## Branches and commits

Create a focused branch from the default branch, for example `feat/question-filter`,
`fix/live-reconnect`, `docs/local-setup` or `chore/tooling`.
Use Conventional Commits: `type(optional-scope): description`.
Examples: `fix(live): reject duplicate answers`, `docs: clarify local database setup`.
Use `feat`, `fix`, `docs`, `test`, `refactor` or `chore` as appropriate. Explain breaking changes
in the commit body with `BREAKING CHANGE:` and mark the type/scope with `!`.

## Code conventions

Keep TypeScript strict and follow feature boundaries in `src/` and `worker/`.
Use two-space indentation, double quotes and semicolons. EditorConfig and Prettier record formatting choices.
Run `npm run format -- path/to/changed-file.ts` on selected files; avoid unrelated whole-repository reformatting.
ESLint checks TypeScript/TSX correctness independently of formatting.
Comment non-obvious constraints and side effects, not syntax. Add regression coverage for behavior changes.
Do not weaken checks, skip tests or introduce credentials to make a build pass.

## Validation

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
node scripts/check-quiz-covers.mjs
git diff --check
```

Use `npm run test:watch` during development. For UI or browser-flow changes, also install Playwright
Chromium and run `npm run e2e`; see the README for fixture and server-reuse behavior.

## Pull-request checklist

- [ ] Explain the problem, resulting behavior and scope.
- [ ] Keep changes focused; include relevant regression coverage and screenshots for UI changes.
- [ ] Run the validation commands above and report their results.
- [ ] Run browser tests when the change affects browser behavior.
- [ ] Update developer documentation and `CHANGELOG.md` under `Unreleased` as needed.
- [ ] Check `git status` and the full diff, including newly added files.
- [ ] Remove credentials, personal data, local exports and generated build/test artifacts.
- [ ] Explain configuration or migration requirements and compatibility risks.

Maintainers review pull requests before merging. No response or merge-time guarantee is implied.
For security issues, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.
