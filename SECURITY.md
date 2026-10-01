# Security Policy

## Reporting a vulnerability

Found a hole in the validation, ownership checks, workflows or deploy script (for example a way to register someone else's name, edit another user's domain, escape validation, or reach the Cloudflare token)?

**Please don't open a public issue or PR.** Report privately instead:

* GitHub: [Report a vulnerability](https://github.com/veeresh-bikkaneti/ai-subdomains/security/advisories/new) (preferred)
* Email: `security@is-ai.si`

Include steps to reproduce and the impact. We're volunteers, but we aim to acknowledge within 3 days and fix verified issues quickly. We'll credit you if you wish. Good-faith research that doesn't harm other users or access their data is welcome.

## Reporting a malicious site on a subdomain

See [ABUSE.md](ABUSE.md). For active phishing or malware, use the private channels above or `abuse@is-ai.si`; verified cases are taken down as fast as a maintainer can act, with a goal of 24 hours.

## How the registry is protected

* **No secrets in PR checks.** The validation workflow runs on `pull_request` with a read-only token; it never uses `pull_request_target`.
* **Deploy only from `main`.** DNS changes are applied by a workflow on merge, using a Cloudflare API token scoped to *Zone > DNS > Edit* on the single `is-ai.si` zone, stored in a protected GitHub environment.
* **Ownership.** A PR can only add, change or remove a domain file whose `owner.username` matches the PR author.
* **Managed records only.** The deploy script only creates, changes or deletes records it tagged with a marker comment, and it aborts if a run would delete more than 10 records.
* **Review of the machinery.** `CODEOWNERS` requires a maintainer for `.github/`, `scripts/`, `lib/` and `config/`.
* **Subdomain takeover.** Because a dangling CNAME can be claimed by others, we remove records that point at hosts that stop serving the name.

Supported version: the current `main` branch.
