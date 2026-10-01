# Maintainer guide

How a small team keeps `is-ai.si` running. All of this is one-time setup, then reviewing PRs.

## 1. DNS zone

1. Add `is-ai.si` to Cloudflare (Free plan is fine) as a full setup zone.
2. At your `.si` registrar, set the nameservers Cloudflare gives you.
3. Note the **Zone ID** (zone Overview page, right sidebar).
4. Set up `security@` and `abuse@` addresses (for example with Cloudflare Email Routing, forwarding to maintainers). The policies promise these exist.

Do not manually create records on names you intend to hand out. The deploy script never touches records without its marker comment, but a name occupied by an unmanaged record is reported as a conflict and skipped.

## 2. Cloudflare API token

Create a token at *My Profile > API Tokens > Create Token > Custom token*:

* Permissions: `Zone` - `DNS` - `Edit`
* Zone Resources: `Include` - `Specific zone` - `is-ai.si`
* Optionally set a TTL and client IP filter (GitHub-hosted runner IPs change, so IP filters usually don't fit).

Free-plan DNS comments are limited to 100 characters; the deploy script uses comments (not tags, which are paid-only) to mark managed records.

## 3. GitHub setup

1. **Environment**: *Settings > Environments > New environment* named `production`. Restrict it to the `main` branch and add `CF_API_TOKEN` and `CF_ZONE_ID` as *environment secrets*.
2. **Branch protection for `main`** (or a ruleset): require a PR, require 1 approval, require review from Code Owners, require the `validate` status check, block force pushes.
3. **Actions**: *Settings > Actions > General*: require approval for first-time contributors' workflow runs, and set the default `GITHUB_TOKEN` to read-only.
4. Enable **private vulnerability reporting** (*Settings > Code security*), which backs the links in SECURITY.md and ABUSE.md.
5. Update `config/maintainers.json` and `.github/CODEOWNERS` with your team's handles (and replace the repo URL in issue-template links if the repo moves).

## 4. Reviewing a registration PR

CI already checked syntax, name rules, record safety, the per-person cap and ownership. You decide the human things:

* Does the name look like squatting or impersonation? Does the description match a plausible real site?
* Is the target sensible? Take a quick look at the site if you want to; don't merge if it looks like a scam, SEO farm or parked page.
* The PR should only add/modify `domains/*.json`. Anything touching `lib/`, `scripts/`, `config/` or `.github/` is a code change; review it as one and never let it ride along with a registration.

Merge. The `Deploy DNS to Cloudflare` workflow runs and records go live within minutes.

## 5. Operating

* **Preview a sync**: *Actions > Deploy DNS to Cloudflare > Run workflow* (dry run is the default).
* **Drift repair**: the workflow also runs daily and restores any managed record that was edited or deleted by hand.
* **Mass delete guard**: a run that would delete more than 10 records fails. If intended, run locally with `FORCE=true` (or raise `MAX_DELETES`).
* **Takedown**: delete the domain file and merge it (maintainers can push the deletion straight to `main` for emergencies). Then follow up with the owner as in [ABUSE.md](ABUSE.md).
* **Token rotation**: create a new token, update the environment secret, revoke the old token.

## 6. Local tools

```sh
npm test
npm run validate
CF_API_TOKEN=... CF_ZONE_ID=... npm run deploy:dry
```
