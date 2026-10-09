# Target-aware Recon Pipeline

This is a staged playbook, not a blind shell chain. Run only against verified in-scope assets. Initialize/reuse CyberStrike's persistent TargetWorkspace first. Set TARGET, SLUG, and OUT to the authorized root domain, safe filename slug, and that workspace's session recon directory. Keep provider tokens in environment variables (GITHUB_TOKEN, SHODAN_API_KEY), never in prompts or artifacts. Check tool availability and record missing tools. Respect scope, exclusions, rate limits, and program technique restrictions.

## 0. Scope gate

Verify authoritative scope and allowed techniques before network activity. If scope cannot be verified, initialize notes and stop. A hostname supplied to /recon is not authorization. Record scope source, exclusions, rates, timestamp, session/run ID.

## 1. Passive subdomain discovery

~~~bash
subfinder -d "$TARGET" -all -recursive -o "$OUT/Subs01_$SLUG.txt"
assetfinder --subs-only "$TARGET" | tee "$OUT/Subs02_$SLUG.txt"
amass enum -passive -d "$TARGET" -o "$OUT/Subs03_$SLUG.txt"
curl -fsS "https://crt.sh/?q=%25.$TARGET&output=json" | jq -r '.[].name_value' | sed 's/\\*\\.//g' | sort -u > "$OUT/Subs05_CRT_$SLUG.txt"
chaos -d "$TARGET" -o "$OUT/Subs06_chaos_$SLUG.txt"
github-subdomains -d "$TARGET" -t "$GITHUB_TOKEN" | tee "$OUT/Subs07_GH_$SLUG.txt"
shosubgo -d "$TARGET" -s "$SHODAN_API_KEY" | tee "$OUT/Subs08_Shodan_$SLUG.txt"
curl -fsS "https://sonar.omnisint.io/subdomains/$TARGET" | jq -r '.[]' > "$OUT/Subs_Sonar_$SLUG.txt"
findomain -t "$TARGET" -u "$OUT/Subs_findomain_$SLUG.txt"
~~~

Run only provider sources permitted by the program. Use tlsx SAN/CN collection on the root and discovered live hosts as a separate inventory step; preserve provider-specific output files.

## 2. DNS, permutations, and HTTP inventory

Brute force, permutations, virtual-host discovery, screenshots, and port scans are noisy/active inventory and require program permission and conservative rates.

~~~bash
wget -q https://raw.githubusercontent.com/trickest/resolvers/main/resolvers.txt -O "$OUT/resolvers.txt"
puredns bruteforce "$DNS_WORDLIST" "$TARGET" -r "$OUT/resolvers.txt" --write "$OUT/Subs_puredns_$SLUG.txt"
gotator -sub "$OUT/Subs01_$SLUG.txt" -perm "$PERMUTATION_WORDLIST" -depth 1 -numbers 3 -mindup -adv -md | puredns resolve -r "$OUT/resolvers.txt" | tee "$OUT/Subs_gotator_$SLUG.txt"
cat "$OUT/Subs01_$SLUG.txt" | alterx -enrich -o "$OUT/alterx_wordlist_$SLUG.txt"
cat "$OUT/alterx_wordlist_$SLUG.txt" | puredns resolve -r "$OUT/resolvers.txt" | tee "$OUT/Subs_alterx_$SLUG.txt"
dnsx -silent -d "$TARGET" -w "$DNS_WORDLIST" | tee "$OUT/Subs_dnsx_$SLUG.txt"
cat "$OUT"/Subs*.txt | sed '/^$/d' | sort -fu > "$OUT/AllSubs_candidates_$SLUG.txt"
httpx -l "$OUT/AllSubs_candidates_$SLUG.txt" -status-code -content-length -content-type -web-server -title -ip -cdn -tech-detect -follow-redirects -threads 20 -silent -json -o "$OUT/httpx_full_$SLUG.json"
jq -r '.url // empty' "$OUT/httpx_full_$SLUG.json" | sort -u > "$OUT/AliveSubs_$SLUG.txt"
jq -r 'select(.status_code != 403 and .status_code != 404) | .url' "$OUT/httpx_full_$SLUG.json" > "$OUT/AliveSubs_filtered_$SLUG.txt"
~~~

Use ffuf Host-header vhost discovery, screenshots, nrich, naabu, nmap, smap, and alternate-port httpx only when explicitly in scope. Don't silently include out-of-scope hostnames in subsequent steps.

## 3. URLs, API routes, parameters, JS

~~~bash
katana -list "$OUT/AliveSubs_$SLUG.txt" -jc -kf all -d 3 -f url -ef woff,css,png,svg,jpg,woff2,jpeg,gif -silent -o "$OUT/KTN_$SLUG.txt"
cat "$OUT/AliveSubs_$SLUG.txt" | gau --threads 20 --blacklist png,jpg,gif,css,woff,svg | sort -u > "$OUT/GAU_$SLUG.txt"
cat "$OUT/AliveSubs_$SLUG.txt" | waybackurls | sort -u > "$OUT/WB_$SLUG.txt"
gospider -S "$OUT/AliveSubs_$SLUG.txt" -t 5 -d 2 --js --sitemap | tee "$OUT/GS_$SLUG.txt"
cat "$OUT/KTN_$SLUG.txt" "$OUT/GAU_$SLUG.txt" "$OUT/WB_$SLUG.txt" "$OUT/GS_$SLUG.txt" | sed '/^$/d' | sort -u > "$OUT/AllURLs_$SLUG.txt"
grep -Ei '\\.js([?#]|$)' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/js_$SLUG.txt"
grep '=' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/params_$SLUG.txt"
grep -Ei '\\.(json|xml|graphql|gql)([?#]|$)|/api/' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/api_$SLUG.txt"
grep -Ei 'login|signin|auth|oauth|reset|password|register' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/login_$SLUG.txt"
grep -Ei 'admin|dashboard|manage|internal|panel|cms|backend' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/admin_$SLUG.txt"
grep -Ei 'redirect|url=|return=|next=|goto=|dest=|target=|forward=' "$OUT/AllURLs_$SLUG.txt" | sort -u > "$OUT/redirect_$SLUG.txt"
cat "$OUT/AllURLs_$SLUG.txt" | subjs | sort -u > "$OUT/all_js_$SLUG.txt"
~~~

If installed and allowed, add waymore, hakrawler, and cariddi at conservative worker limits. Use arjun, ParamSpider, and x8 only under approved testing conditions. URLs and parameter names are leads, not findings.

## 4. JS, secrets, and repository review

Run approved static analysis (SecretFinder, mantra, jsleak, jsecret, titus) against discovered in-scope JavaScript. GitHub/org/repo scans (GitDorker, trufflehog, gitleaks) require the organization/repository to be in scope. Redact all secret values; do not validate credentials by default.

## 5. Active checks require separate authorization

Not part of the default passive run. Select the smallest relevant subset after confirming scope and permission, with safe rates, test accounts, and stop conditions:
- Content/vhost fuzzing: ffuf, dirsearch, meg; API route discovery: Kiterunner and ffuf API wordlists.
- Exposure/CVE checks: Nuclei exposure/CVE templates; manually validate alerts.
- API checks: Swagger/OpenAPI and GraphQL schema discovery.
- Headers/CORS: Corsy, ppfuzz, bfac.
- Service inventory: naabu, nmap, smap, nrich, alternate-port checks.
- Cloud/repository metadata: cloud-enum, s3scanner, git metadata and DS_Store checks on in-scope assets.
- SQLMap exploitation, SSRF callbacks/SSRFmap, smuggler, JWT attack modes, ysoserial/phpggc payloads, broad vulnerability fuzzing, and RCE payloads require separate explicit authorization plus a concrete evidence-backed hypothesis. Never run destructive, data-extracting, persistence, or remote-code-execution payloads as an automatic recon step.

## 6. Merge and correlate

~~~bash
# Merge only this workspace's outputs; do not glob files from an uncontrolled working directory.
cat "$OUT"/Subs*.txt "$OUT"/Subs_*_"$SLUG".txt 2>/dev/null | sed '/^$/d' | sort -fu > "$OUT/AllSubs_$SLUG.txt"
cat "$OUT"/KTN_$SLUG.txt "$OUT"/GAU_$SLUG.txt "$OUT"/WB_$SLUG.txt "$OUT"/GS_$SLUG.txt 2>/dev/null | sed '/^$/d' | sort -u > "$OUT/AllURLs_$SLUG.txt"
~~~

Update attack-surface.md with scope status, domains, live hosts/services, APIs, parameters, JS, identity boundaries, exclusions, evidence confidence, and next steps. Update target-notes.md with system architecture, shared target identity across subdomains, page/JS/function/endpoint relationships, auth/role observations, confirmed facts, hypotheses, and negative results. Treat requests as observations, not separate targets; deduplicate canonical endpoint identity while retaining method, parameters, account label, status, provenance, timestamps, and run/session IDs. Maintain a run manifest (tool/version, command, timestamps, exit status, output paths). Report counts, artifact paths, missing tools, blocked stages, errors, and next safe step.
