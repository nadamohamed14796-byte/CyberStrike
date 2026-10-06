---
name: recon-toolchain
description: Signal-driven external web and API reconnaissance toolchain. Selects and orchestrates installed enumeration, DNS, HTTP, crawling, JavaScript, parameter, API, network, cloud, and vulnerability-assessment tools based on scope and observed signals. Use only on explicitly authorized targets.
version: 1.0.0
revision_date: 2026-10-06
license: MIT
platforms: [linux]
tags: [recon, tooling, bug-bounty, asset-discovery, web, api, dns, javascript]
category: recon
related_skills:
  - recon-playbook
  - subdomain-enumeration
  - web2-recon
  - triage-validation
  - evidence-hygiene
---

# Recon Toolchain

This skill is the **tool-selection and orchestration layer** for CyberStrike.
It does not replace vulnerability-specific skills. It turns a target plus
observed signals into a bounded sequence of tool calls, normalizes their
outputs, and passes the resulting artifacts to the next skill.

## Hard Rules

1. Confirm scope before active probing.
2. Never infer authorization from a domain name, certificate, GitHub repository,
   or public exposure.
3. Prefer passive discovery first.
4. Respect target/program rate limits. Keep concurrency configurable.
5. Do not run destructive/state-changing actions automatically.
6. Do not treat a scanner hit, status code, banner, reflection, or version as
   a confirmed finding.
7. Preserve provenance: every artifact records the tool, command class,
   timestamp, target, and source.
8. Stop when the requested phase is complete; do not run the entire catalog
   merely because tools exist.

## Tool Selection Matrix

### 1. Subdomain / Asset Discovery

**Primary**
- subfinder: passive subdomain aggregation.
- assetfinder: passive hostname discovery.
- amass enum -passive: passive DNS/OSINT enumeration.
- tlsx: TLS SAN/CN discovery from known hosts.
- crt.sh: certificate-transparency discovery.
- chaos: ProjectDiscovery Chaos dataset, when configured.
- github-subdomains: GitHub-derived subdomain discovery, when token is configured.
- shosubgo: Shodan-derived subdomain discovery, when API access is configured.
- findomain: passive/OSINT domain discovery.
- sonar/Omnisint: supplemental passive discovery.
- dnsx: DNS resolution and wildcard-aware validation.

**Expansion / prediction**
- gotator: permutations from known subdomains.
- alterx: template/enrichment-based permutations.
- puredns: controlled DNS resolution/bruteforce using approved resolvers.
- ffuf Host-header vhost discovery: only when vhost enumeration is explicitly
  in scope.

**Do not use one source as ground truth.** Merge, normalize, deduplicate, then
validate DNS and HTTP reachability.

### 2. Live Web Discovery

- httpx: HTTP/HTTPS probing, status, title, server, IP, CDN, technologies,
  redirects, screenshots, JSON output.
- nrich: enrichment/CVE hints for discovered IPs.
- naabu: scoped TCP port discovery.
- nmap: service/version discovery when port scanning is in scope.
- smap: supplemental port/service discovery.

Output contracts:
- `AllSubs_<target>.txt`: normalized unique in-scope hostnames.
- `httpx_full_<target>.jsonl`: structured HTTP observations.
- `AliveSubs_<target>.txt`: normalized reachable URLs.
- `ports_<target>.txt`: discovered ports.
- `nmap_<target>.*`: service evidence.

### 3. URL / Route / Client Discovery

- katana: current crawling and JavaScript-aware route discovery.
- gau: historical URLs.
- waybackurls: Wayback URLs.
- gospider: crawler/JS/sitemap discovery.
- hakrawler: lightweight web crawling.
- waymore: historical URL and parameter discovery.
- cariddi: URL/content/link/endpoint enrichment.
- meg: bounded bulk path probing.
- dirsearch: content/path discovery.
- ffuf: directory, API-route, parameter, and vhost fuzzing.
- kiterunner: API route discovery from API-specific wordlists.

Normalize into:
- `AllURLs_<target>.txt`
- `js_<target>.txt`
- `params_<target>.txt`
- `api_<target>.txt`
- `login_<target>.txt`
- `admin_<target>.txt`
- `idor_<target>.txt`
- `redirect_<target>.txt`

Historical sources are discovery hints only. Revalidate current reachability.

### 4. JavaScript / Source / Secret Discovery

- subjs: extract referenced JavaScript.
- SecretFinder: static secret-pattern discovery.
- mantra: JavaScript secret/interesting-string extraction.
- jsleak: JavaScript leak detection.
- jsecret: JavaScript secret discovery.
- titus: secret scanning of live JavaScript and Git history.
- trufflehog: verified secret discovery in GitHub/repositories/files.
- gitleaks: repository secret scanning.
- GitDorker: GitHub search/dorking when explicitly authorized.

Pipeline:
`routes -> JS URLs -> downloaded JS -> source-map discovery -> secret candidates
-> validation -> evidence`.

A secret-looking string is a lead, not a credential finding. Validate scope,
ownership, privilege, and whether the value is actually sensitive.

### 5. Parameter Discovery

- arjun: parameter discovery.
- paramspider: historical/common parameter discovery.
- x8: parameter discovery/fuzzing.
- qsreplace: deterministic parameter replacement.
- freq: parameter frequency/prioritization.

Use parameter tools after route discovery, not as a replacement for it.
Keep a distinction between observed parameters and guessed parameters.

### 6. Focused Web Security Scanners

- nuclei: exposure, CVE, fuzzing, and targeted template assessment.
- dalfox: XSS candidate analysis.
- kxss: reflection/context discovery.
- sqlmap: SQL injection assessment only after a concrete candidate exists and
  the program permits automated injection testing.
- corsy: CORS candidate discovery.
- ppfuzz: parameter/payload fuzzing.
- bfac: access-control/403-bypass candidate discovery.
- smuggler: HTTP request-smuggling candidate assessment.

Scanner output MUST enter the validation layer before reporting.

### 7. API / GraphQL

- kiterunner: API route discovery.
- ffuf: bounded API route fuzzing.
- curl: OpenAPI/Swagger candidate checks.
- graphw00f: GraphQL fingerprinting.
- graphql-cop: GraphQL security checks.
- clairvoyance: GraphQL schema inference where authorized.

Routing:
- OpenAPI/Swagger evidence -> API documentation review skill.
- GraphQL evidence -> GraphQL skill.
- Object identifiers -> IDOR/BOLA skill.
- Authentication tokens -> JWT/authentication skill.

### 8. SSRF / OOB / Protocol Testing

- interactsh-client: OOB interaction infrastructure.
- SSRFmap: SSRF candidate validation from a captured request.
- Use OOB validation only after an application-controlled URL-fetch signal exists.

Never spray an OOB payload across every parameter. Select candidates using
parameter names, data flow, response behavior, or application documentation.

### 9. Cloud / Storage Enumeration

- cloud-enum: cloud naming/enumeration checks.
- s3scanner: S3-compatible bucket discovery/checks.

Cloud enumeration must stay inside program scope and must not download or
enumerate customer data merely because a bucket/object is reachable.

### 10. Exposed Files / Source Repositories

- git-exposure checks: detect whether `/.git/HEAD` is accidentally public.
- git-dumper: retrieve an exposed repository only when the program permits
  collection and the exposure has already been established.
- ds_store: analyze an intentionally retrieved .DS_Store artifact.
- dirsearch/ffuf: discover candidate sensitive files.

Do not automatically retrieve secrets or private customer data.

## Recommended Phase Graph

```
scope
  -> passive assets
  -> DNS validation
  -> HTTP probing
  -> ports/services (scope permitting)
  -> current URL crawling
  -> historical URL enrichment
  -> JS extraction
  -> parameter/API classification
  -> signal-specific tool
  -> validation
  -> evidence
  -> report
```

### Signal -> Next Tool

| Signal | Next action |
|---|---|
| New root/subdomain | subfinder/assetfinder/amass/crt.sh + dnsx |
| TLS SAN/CN evidence | tlsx -> normalize -> DNS/HTTP validation |
| Live HTTP service | httpx -> katana |
| Large JS surface | subjs -> JS analysis tools |
| Source map | download/inspect map -> source-leak analysis |
| URL parameters | arjun/paramspider/x8 -> targeted validation |
| API paths | kiterunner/ffuf -> API skill |
| GraphQL marker | graphw00f -> graphql-cop/clairvoyance |
| Redirect-like parameter | targeted redirect/SSRF skill |
| URL-fetch/server callback behavior | interactsh/SSRF validation |
| Reflected parameter | kxss/dalfox -> XSS validation |
| SQL-like behavior | focused SQLi validation; sqlmap only if permitted |
| JWT observed | JWT/authentication skill |
| CORS headers | corsy -> manual origin/credential validation |
| 403 on interesting route | bfac/manual authorization validation |
| Possible smuggling signal | smuggler/manual differential validation |
| Open port | nmap/service-specific skill |
| Cloud naming signal | cloud-enum/s3scanner |
| Exposed .git | preserve headers/evidence -> authorized source exposure validation |

## Installation / Capability Check

Before selecting a tool, check availability:

```bash
command -v subfinder assetfinder amass tlsx httpx dnsx katana gau waybackurls   gospider hakrawler waymore ffuf dirsearch nuclei naabu nmap dalfox arjun   paramspider x8 kiterunner subjs jq curl
```

Optional tools must be marked unavailable rather than silently substituted.
API-backed tools must report whether their provider credentials are configured.

## Output and Learning Contract

Every tool invocation should produce a small structured record containing:

```text
target
scope_decision
phase
tool
input_artifact
output_artifact
started_at
finished_at
rate_limit
result_count
error
confidence
next_signal
```

Learning receives:
- successful discovery source;
- useful tool/wordlist combination;
- negative result;
- false positive;
- validated technology signal;
- confirmed endpoint relationship.

Learning MUST NOT rewrite this skill automatically. It should update the
separate learning/reference layer.

## False-Positive Gate

Never promote:
- scanner output alone;
- a version string alone;
- a reflected marker alone;
- a 200/403 response alone;
- an exposed public identifier alone;
- a DNS/TLS name alone;
- a secret-pattern match without sensitivity/ownership validation.

Promote only after the relevant vulnerability skill establishes reproducible
security impact with appropriate controls.

## Safety Boundaries

High-impact tools and actions such as automated injection, request-smuggling
testing, repository retrieval, OOB callbacks, or exploit-generation helpers
must be gated by explicit authorization and the target's testing policy.
Prefer the least-invasive command that can distinguish a hypothesis from a
false positive.

## Completion Criteria

Recon is complete for the requested phase when:
- outputs are normalized and deduplicated;
- every active result is traceable to scope;
- tool failures are recorded;
- current and historical URLs are distinguished;
- JS, parameters, APIs, ports, and technologies are classified;
- signals are routed to focused skills;
- no scanner result is reported without validation.
