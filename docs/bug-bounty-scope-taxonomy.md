# Bug Bounty Scope Taxonomy

This document defines the normalized scope model for CyberStrike. The `scope_check` tool now accepts either string patterns, normalized `asset_records`, or a raw `asset_csv` export with the 12-column asset schema below. Matching support does not replace verification of the program policy or authorize actions outside that policy.

## 1. Separate four independent dimensions

1. **Asset kind** — what the target is.
2. **Matcher syntax** — how an asset is identified.
3. **Program authorization status** — whether the program explicitly permits testing.
4. **Report eligibility policy** — whether a report may be accepted, including reports about unlisted assets.

Never infer active-testing authorization from report eligibility alone.

## 2. Asset kinds

- Web domain / registrable domain (for example, `example.com`)
- Exact hostname / subdomain (for example, `api.example.com`)
- Wildcard hostname family (for example, `*.example.com`)
- HTTP(S) URL, origin, and path/prefix
- IP address (IPv4 and IPv6, when supported)
- IP network/CIDR (IPv4 and IPv6, when supported)
- TCP/UDP port or port range, only when the program defines it
- Mobile applications (Android package/application ID; iOS bundle ID; store listing as an identifier)
- Desktop applications and downloadable clients
- Source-code repositories and specific organizations/projects
- APIs, API versions, GraphQL endpoints, and WebSocket endpoints
- Cloud resources and accounts (provider, account/project/subscription, region, resource identifier)
- SaaS tenants, environments, staging/test systems, and production systems
- Hardware, firmware, IoT, and network devices
- Third-party/vendor-hosted assets
- Physical/social-engineering targets, only where a program explicitly authorizes them
- Other explicitly named assets or asset groups

Asset kind does not decide authorization by itself.

## 3. Matcher forms

- Exact domain: `example.com`
- Exact hostname: `api.example.com`
- Subdomain wildcard: `*.example.com`
- Explicit scheme/origin: `https://example.com`
- Host plus port: `https://example.com:8443`
- URL path/prefix: `https://example.com/api/v1/`
- IPv4/IPv6 literal
- CIDR network: `192.0.2.0/24` or an IPv6 CIDR
- Explicit list of named assets / app IDs / repository URLs / cloud resource IDs
- Program-defined asset group or tag
- Exclusion/negative matcher, such as an explicitly excluded hostname or path
- Multiple include patterns with higher-priority exclusions
- No pattern / unlisted asset: must be resolved by policy and ownership evidence, not by a permissive wildcard fallback

The structured inventory parser supports comma shorthand alternatives such as `*.nymhair.co.uk,.com,.uk`, brace alternatives such as `*.wc-frisch.{de,ch}`, and the tested `*.brand.*` wildcard-TLD form. Wildcard-TLD matching is intentionally constrained; unrecognized forms fail closed. General regexes, arbitrary suffix matching, and bare IP ranges are not inferred.

## 4. Program authorization modes

Represent authorization separately from asset matching:

- `IN_SCOPE_EXPLICIT`: explicitly listed and permitted for testing.
- `IN_SCOPE_WILDCARD`: matched by an explicitly authorized wildcard.
- `IN_SCOPE_GROUP`: included by a documented asset group or program rule.
- `OPEN_SCOPE_UNLISTED_REPORTS`: the program says reports may be accepted for owned but unlisted assets based on impact. This is **report eligibility only** unless the policy separately authorizes testing.
- `DISCLOSURE_ONLY`: report submission may be allowed, but active testing permission is not established.
- `OUT_OF_SCOPE_EXPLICIT`: explicitly excluded by the program.
- `THIRD_PARTY_RESTRICTED`: vendor/third-party asset with no explicit authorization to test.
- `UNKNOWN_REQUIRES_REVIEW`: ownership, scope, or policy is unclear.
- `POLICY_CONFLICT`: an inclusion and exclusion conflict; fail closed and request review.

## 5. Structured asset CSV schema\n\nThe parser preserves and interprets all fields below rather than reducing a row to its identifier:\n\n- `identifier`: the asset matcher text.\n- `asset_type`: controls matching (`URL`, `WILDCARD`, IP/CIDR/network types, or exact identity matching for non-web IDs). Unknown/non-web identifiers are never converted into host-only matches.\n- `instruction`: surfaced to the agent as asset-specific guidance; it does not override authorization boundaries.\n- `eligible_for_bounty`: reward eligibility; `false` means no bounty is assumed even when submission is allowed.\n- `eligible_for_submission`: report submission eligibility; `false` suppresses report eligibility for that matched asset.\n- `availability_requirement`, `confidentiality_requirement`, `integrity_requirement`: preserved and surfaced as asset impact/security requirements, not interpreted as permission to cause impact.\n- `max_severity`: surfaced as a severity cap; an optional proposed severity above it produces a policy warning.\n- `system_tags`: split into tags and surfaced for context/classification.\n- `created_at`, `updated_at`: preserved and surfaced so freshness can be reviewed; timestamps alone do not prove the policy is current.\n\nThe CSV header must contain all 12 fields shown in the user-provided schema. Quoted commas are supported. `scope_check` accepts the CSV string directly as `asset_csv`, or equivalent structured objects as `asset_records`.\n\n## 6. Report eligibility and reward policies

Store these as policy metadata, not as scope matchers:

- Paid bug bounty / reward eligible
- VDP / disclosure-only or no monetary reward
- Reports accepted for unlisted owned assets based on demonstrated impact
- Asset-specific reward eligibility or exclusions
- Vulnerability class exclusions
- Severity/impact thresholds and duplicate rules
- Safe-harbor wording and authorization limits
- Required headers, researcher identification, rate limits, and testing constraints
- Submission channel and evidence requirements

A program can accept a report without authorizing further probing. Reward eligibility is not proof of scope.

## 7. Required policy record

For every program, preserve:

- Program name and canonical policy URL
- Exact original scope/policy text and retrieval timestamp
- Asset entries and asset kind
- Include patterns and explicit exclusions
- Authorization mode and whether active testing is expressly allowed
- Report eligibility / reward policy
- Evidence and confidence for ownership
- Applicable rate limits, prohibited actions, and safe-harbor conditions
- Parser/matcher version and validation status
- Review state: confirmed, ambiguous, conflicting, or stale

## 8. Decision order (fail closed)

1. Normalize the candidate without losing the original value.
2. Resolve the exact asset kind and matcher result.
3. Apply explicit exclusions before any general inclusion.
4. Confirm the program's authorization language for active testing.
5. Treat unlisted-asset report acceptance as report eligibility only unless active-testing permission is explicit.
6. If ownership, exclusions, policy text, or matcher semantics are uncertain, return `UNKNOWN_REQUIRES_REVIEW` and do not actively test.
7. Record the matching rule, evidence, and reason in the result.

## 9. Minimum test matrix

Test exact hosts; root vs subdomain behavior for wildcards; nested subdomains; lookalike/suffix attacks (for example, `notexample.com`); case and trailing-dot normalization; IDNs/punycode; scheme and default/non-default ports; path boundaries (`/api` must not accidentally match `/apix`); IPv4/IPv6 and CIDR boundaries; include/exclude conflicts; stale or missing policy text; unlisted owned assets; third-party hosted assets; and report-eligible-but-not-authorized cases.

A feature is supported only when its parser, matcher, policy decision, and tests agree. Documentation alone does not enable a matcher or grant authorization.
