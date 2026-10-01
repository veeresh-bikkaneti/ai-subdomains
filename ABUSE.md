# Reporting Abuse

If a `*.is-ai.si` site is breaking the [Terms of Service](TERMS_OF_SERVICE.md), tell us.

| What you found | Where to report |
| --- | --- |
| Active **phishing, malware, illegal content, or credentials being stolen** | Private: [GitHub private report](https://github.com/veeresh-bikkaneti/ai-subdomains/security/advisories/new) or email `abuse@is-ai.si`. Don't post it in a public issue. |
| Spam, SEO farms, scams, impersonation, squatting, Code of Conduct issues | [Open an abuse report issue](../../issues/new?template=abuse-report.yml) |
| A vulnerability in the registry itself | See [SECURITY.md](SECURITY.md) |

Please include the subdomain, what you saw, when, and a screenshot or URL if safe. Don't visit suspicious sites on a machine you care about, and never send us passwords or personal data.

## What happens next

1. A maintainer triages the report. Clear cases of active harm are handled first.
2. For harmful content, the DNS records are removed immediately by deleting the domain file (a normal PR/merge, or a maintainer's direct commit), and the site owner is told why afterwards.
3. For gray areas (e.g. squatting, a name dispute) the owner is notified through the GitHub account on file and given a reasonable time to respond.
4. Repeat or severe offenders lose all their subdomains and may be banned from the repository.
5. We may report criminal content to the relevant hosting provider, registrar or authorities.

Reporters can ask to stay anonymous. Appeals go through an issue or `security@is-ai.si`.
