# is-ai.si

Free `yourname.is-ai.si` subdomains for developers, researchers and AI builders. Run by volunteers, managed entirely through pull requests.

## Get your subdomain in 4 steps

1. **Fork** this repository.
2. **Add one file**, `domains/<name>.json`, where `<name>` is the subdomain you want:

   ```json
   {
     "description": "My personal portfolio",
     "owner": {
       "username": "your-github-username",
       "email": "optional-public-contact@example.com"
     },
     "records": {
       "CNAME": "your-github-username.github.io"
     }
   }
   ```

3. **Open a pull request.** Automated checks run in about a minute and tell you exactly what to fix.
4. **A maintainer reviews and merges.** Within a few minutes of the merge, GitHub Actions publishes your DNS records to Cloudflare and `<name>.is-ai.si` resolves.

Full details and rules are in [CONTRIBUTING.md](CONTRIBUTING.md).

## What happens after approval

| When | What |
| --- | --- |
| PR opened | CI validates the JSON, the name, the records, and that **you** (the PR author) own the file. |
| PR merged | The `Deploy DNS to Cloudflare` workflow compares `domains/` to Cloudflare and creates, updates or deletes only the records this registry manages. |
| ~1-5 minutes later | Your record is live. DNS caches can add a little delay; CNAME/A changes are not proxied and use automatic TTL. |
| You need a change | Open another PR editing your file. Deleting your file removes your DNS records. |

Note that the DNS record is only half the job: your host must also be told to serve the domain (for GitHub Pages, add `<name>.is-ai.si` as the custom domain in your repository's Pages settings; Netlify, Vercel and Cloudflare Pages have the same step).

## Supported records

`A`, `AAAA` (public addresses only), `CNAME` and `TXT` (for domain verification). A `CNAME` cannot be combined with other records on the same name. Mail (`MX`) and delegation (`NS`) records are not offered.

## Rules in one breath

Use it for a real personal site or project. No phishing, malware, spam, scams, impersonation or illegal content, at most 3 subdomains each, and no reserved or look-alike names. Read the [Terms of Service](TERMS_OF_SERVICE.md).

## Reporting abuse or vulnerabilities

* Spam, impersonation, squatting: [open an abuse report](../../issues/new?template=abuse-report.yml).
* Active phishing/malware or a security hole: see [ABUSE.md](ABUSE.md) and [SECURITY.md](SECURITY.md) (private channels).

## Running this yourself

Maintainers: see [MAINTAINING.md](MAINTAINING.md) for Cloudflare token, GitHub environment and branch-protection setup. Local checks:

```sh
npm test                 # unit tests (Node 20+, zero dependencies)
npm run validate         # validate domains/*.json
CF_API_TOKEN=... CF_ZONE_ID=... npm run deploy:dry   # show planned DNS changes without applying
```

## License

Code is MIT licensed, see [LICENSE](LICENSE). Subdomains are a revocable service, not property; see the Terms.
