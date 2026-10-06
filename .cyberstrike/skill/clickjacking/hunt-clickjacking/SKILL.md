---
name: hunt-clickjacking
description: Hunt Clickjacking — missing X-Frame-Options / CSP frame-ancestors lets an attacker embed the target page in an invisible iframe and trick victims into clicking buttons they cannot see (UI redressing). Targets: login flows, money transfers, account settings, OAuth confirmation pages. Confirm by fetching the page, then PROVE it frames in a real browser and a sensitive state-changing action survives the cross-site context (SameSite cookies / framebusting JS can defeat it) — header-absence alone is not a finding.
tags: [bug-bounty, security-testing, hunt, clickjacking]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web-testing
---

# hunt-clickjacking

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt Clickjacking — missing X-Frame-Options / CSP frame-ancestors lets an attacker embed the target page in an invisible iframe and trick victims into clicking buttons they cannot see (UI redressing). Targets: login flows, money transfers, account settings, OAuth confirmation pages. Confirm by fetching the page, then PROVE it frames in a real browser and a sensitive state-changing action survives the cross-site context (SameSite cookies / framebusting JS can defeat it) — header-absence alone is not a finding.

## Workflow
1. Confirm authorization and scope before testing.
2. Identify the concrete signal that triggered this capability.
3. Form a testable hypothesis from observed behavior, code, traffic, or technology fingerprints.
4. Validate with the least-invasive reproducible test needed to establish the security boundary failure.
5. Correlate related requests, responses, client code, identity state, and infrastructure when the issue crosses layers.
6. Preserve reproducible evidence and route confirmed chains to the relevant validation/reporting skill.

## False-Positive Gate
A scanner alert, reflection, exposed endpoint, version string, or suspicious code pattern is not sufficient by itself. Require a reproducible behavior and demonstrated security impact before treating the result as a finding.

## Routing
Load this skill when its signal is stronger than generic scanning. Combine with another skill only when there is a concrete chain or shared data flow. Record useful negative results and confirmed observations in the learning layer.

## Safety
Use only on authorized targets. Prefer test accounts and synthetic data; avoid destructive actions, unnecessary access to third-party data, credential abuse, persistence, or disruption.

## Provenance
Adapted from **elementalsouls/Claude-BugHunter** under **CC BY 4.0**. This is an adapted CyberStrike skill, not a verbatim copy.
Source: https://github.com/elementalsouls/Claude-BugHunter

---

## Signal Contract

Activate only on concrete framing evidence. Strong signals are:
- missing/ineffective X-Frame-Options on an interactive in-scope page;
- CSP with absent or permissive frame-ancestors;
- deprecated or malformed X-Frame-Options;
- observed cross-origin iframe rendering;
- frame-busting behavior requiring browser validation;
- a sensitive authenticated action reachable from a frameable page.

Do not treat the strings clickjacking, iframe, X-Frame-Options, or CSP alone as activation signals.

## Validation Contract

Follow this state machine:
signal → candidate → policy-observed → browser-validated → impact-proven → finding

Policy inspection must capture the final URL after redirects, response headers, CSP frame-ancestors, and authentication context. Browser validation must establish whether the target actually renders in a normal attacker-controlled cross-origin frame.

Missing headers, scanner results, status codes, or theoretical framing are never sufficient for a finding.

## Impact Contract

Require a reproducible security-relevant action. Examples include account/security setting changes, administrative actions, payment/transaction confirmation, OAuth consent, API-key/webhook changes, deletion, or MFA/security-control changes.

Frameability without meaningful impact remains a candidate/observation.

SameSite cookies, CSRF tokens, origin/referrer checks, and frame-busting JavaScript can prevent exploitation and must be recorded as negative evidence when applicable.

## Routing

- Authentication/session question → auth-sec.
- Cross-site request semantics → canonical CSRF skill.
- Business-state or workflow impact → business-logic-vuln.
- API-backed action with concrete API evidence → api-sec.
- General WSTG coverage/reference → wstg-clnt-09.

Do not re-run another specialist's complete test suite. Pass the exact unanswered question and captured evidence instead.

## Bounded Execution

- Reuse existing HTTP and browser artifacts.
- Keep one canonical evidence lineage per target URL, identity, and framing origin.
- Avoid repeating unchanged policy checks.
- Use alternate-browser checks only when browser-specific behavior is material.
- Stop when policy and impact are answered or no new evidence can be obtained safely.

## Evidence Handoff

Pass: target/scope, canonical URL, final URL, framing origin, effective policy, auth state, action/control, request/response references, browser result, negative controls, and the exact unanswered question.