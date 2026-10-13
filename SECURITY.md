# Security policy

## Supported scope

Security fixes target the current default branch. There are no tagged release lines or long-term
support commitments. Scope includes the React client, Worker API, authentication, D1 access,
R2 media routes and live-session Durable Object in this repository.

## Responsible reporting

Do not disclose exploitable details, tokens, student information or account data in public issues.
Use GitHub's [private vulnerability reporting entry point](https://github.com/AlexisLD-DEV/easypz/security/advisories/new)
if the repository exposes it. Its availability must be enabled by the maintainer and is not guaranteed by this file.
If unavailable, contact [the maintainer](https://github.com/AlexisLD-DEV) to request a private reporting channel,
without publishing vulnerability details. You can also write to contact@alexisld.fr; expect an acknowledgement within 7 days.

Include the affected commit, impact, minimal reproduction using synthetic data, and any proposed mitigation.
Test on your own local deployment. Do not access other users' data, send real emails, disrupt the hosted
service or run load tests against it. Third-party platform vulnerabilities should be reported to their vendors.

## Response targets

The project targets acknowledgement within 7 calendar days and an initial assessment within 14 calendar days.
These are best-effort targets for a maintainer-run project, not a service-level agreement.
If no acknowledgement arrives after 7 days, follow up through the private channel.
Fix and disclosure timing depend on severity and complexity; coordinate publication with the maintainer.

## Security boundaries

Teacher/admin actions require authenticated roles. Live student access uses participant/session credentials.
Origin checks supplement authentication on protected browser requests.
Media URLs are publicly readable to support anonymous practice and student views; opaque storage keys
are not an authorization boundary. Do not upload sensitive material. Long-lived cached media URLs may
remain accessible after sharing; consider this when assessing disclosure impact.

Keep deployment credentials and environment-specific identifiers outside Git. Removing a file from a
new commit does not erase earlier history; exposed credentials require revocation and a separate history review.
