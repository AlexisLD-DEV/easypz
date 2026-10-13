# Deployment

The repository supplies a public configuration template. Its D1 identifier, administrator and sender
are examples; do not deploy them unchanged. The current hosted service is not changed by editing this template.
No deployment or production-health workflow is included in this public repository.

## Private configuration

1. Authenticate Wrangler in your own environment with `npx wrangler login`.
2. Create resources with `npx wrangler d1 create quiz_english` and
   `npx wrangler r2 bucket create quiz-english-media` (choose unique names if needed).
3. Copy `wrangler.jsonc` to the ignored `wrangler.private.jsonc` in the repository root.
4. Set the private configuration's database identifier, bucket name, Worker name and owned routes.
   Remove every example/unowned route. Preserve the binding names `DB`, `MEDIA_BUCKET`,
   `LIVE_SESSION_ROOM` and `ASSETS`, which the application expects.
5. Set `APP_ORIGIN` to your deployed origin. Configure `ADMIN_EMAIL` and `EMAIL_FROM` privately.
   Store the optional email key with `npx wrangler secret put RESEND_API_KEY --config wrangler.private.jsonc`.
   Never put account identifiers, real addresses or API credentials in tracked files.

`vite.config.ts` passes the optional `WRANGLER_CONFIG` environment variable to the Cloudflare plugin’s `configPath` option.
Build and deploy with the same resource configuration; Vite generates a deployment configuration in `dist/`.

```sh
WRANGLER_CONFIG=wrangler.private.jsonc npm run build
```

Confirm `dist/quiz_english/wrangler.json` exists (the directory follows the configured Worker name).
Inspect its bindings locally before deployment; generated files may contain private values and stay ignored.

## Deployment order

Run all README verification commands first. For an existing remote database, export a backup before migration:

```sh
mkdir -p backups
npx wrangler d1 export quiz_english --remote --config wrangler.private.jsonc --output "backups/quiz-$(date -u +%Y%m%dT%H%M%SZ).sql"
npx wrangler d1 migrations apply quiz_english --remote --config wrangler.private.jsonc
```

For a newly provisioned database there is no prior application data to back up. Apply migrations, then
replace the initial `prof@example.org` allowlist entry with the intended administrator through a private,
reviewed SQL operation before exposing registration. Set `ADMIN_EMAIL` to the same address.
Do not edit historical migration files to configure an existing deployment.

After validating migrations and bindings, deploy the generated configuration:

```sh
npx wrangler deploy --config dist/quiz_english/wrangler.json
```

Adapt the generated directory if the Worker name differs. `npm run deploy` is a convenience wrapper;
explicitly selecting the generated configuration makes the intended deployment auditable.
CI deploy credentials, if added later, belong in an environment secret store with access restricted
to the intended account/resources and deployment approvals appropriate to the project.

## Post-deploy checks and recovery

Verify the landing page, `/api/public/quizzes`, teacher login and a disposable practice/live session.
Check Worker error logs. Run the 30-student smoke only in an environment authorized for test data and load.

A Worker rollback does not roll back D1 migrations. Assess schema compatibility before restoring an
older Worker. Retain backups privately and plan any database restore separately; never publish database exports.
