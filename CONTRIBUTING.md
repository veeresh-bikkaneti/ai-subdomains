# Contributing

There are two kinds of contributions: **registering a subdomain** (most people) and **improving the project**.

## Registering a subdomain

1. Fork the repo and create `domains/<name>.json`.
2. Open a PR. One domain file per PR is the norm (the limit is 3 files).
3. Fix anything the checks report, push to the same branch, and wait for a volunteer. We review when we have time; please don't ping maintainers.

### Choosing a name

* 3-32 characters: lowercase `a-z`, `0-9` and single hyphens; no leading/trailing hyphen.
* Not reserved (`www`, `mail`, `admin`, `api`, ... see [`config/reserved.json`](config/reserved.json)).
* No brand or scam bait (`paypal-support`, `free-airdrop`, ... see [`config/blocked.json`](config/blocked.json)). Think the blocklist is wrong? Open an issue.
* No punycode (`xn--`) or double hyphens, to avoid look-alike names.
* Don't register someone else's name or project name. First come, first served, but squatting is revoked.

### The JSON file

| Field | Required | Rules |
| --- | --- | --- |
| `description` | yes | 5-140 characters, no links. What the site is. |
| `owner.username` | yes | Your GitHub username. **Must equal the PR author.** |
| `owner.email` | no | Public contact address. Optional because the file is public. |
| `records` | yes | At least one record, see below. |

Unknown fields are rejected so typos get caught.

### Records

| Type | Value | Rules |
| --- | --- | --- |
| `CNAME` | one hostname string | Lowercase FQDN like `user.github.io`; no IPs, no trailing dot, not inside `is-ai.si`. Cannot be combined with other types. |
| `A` | string or array (max 4) | Public IPv4 only (no private/loopback/reserved ranges). |
| `AAAA` | string or array (max 4) | Public IPv6 only. |
| `TXT` | string or array (max 5) | 1-255 printable ASCII characters each. For verification codes (e.g. GitHub Pages). |

```json
{
  "description": "Notes on small language models",
  "owner": { "username": "octocat" },
  "records": {
    "A": ["185.199.108.153", "185.199.109.153"],
    "TXT": ["github-pages-verification=abc123"]
  }
}
```

### Changing or removing your domain

Edit or delete your own file in a new PR. The ownership check only lets the original `owner.username` change or delete a file (maintainers excepted). Domains pointing at hosts that no longer serve them, or inactive for a long time, may be reclaimed after notice.

### Checking locally

```sh
npm run validate
```

## Improving the project

Bug fixes, docs and tests are welcome. Keep it dependency-free where possible, add a test for behaviour changes (`npm test`), and keep the registry rules readable: a volunteer should be able to understand every check in a few minutes. PRs that touch `lib/`, `scripts/`, `config/` or `.github/` need a maintainer review and must not also contain domain registrations.

Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).
