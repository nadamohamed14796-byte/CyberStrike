---
name: hunt-auth-bypass
description: Hunting skill for auth bypass vulnerabilities. Built from 12 public bug bounty reports across SAML XSW / parser-differential (GitHub Enterprise CVE-2025-25291/25292), SAML signature stripping (Uber, Rocket.Chat, samlify CVE-2025-47949), SAML domain enforcement bypass via control characters (HackerOne 2024), partner-portal cross-IdP assertion reuse (Slack), WordPress XMLRPC bypassing SSO (Uber), JWT alg-confusion HS256/RS256 (Jitsi), JWT signature-validation skip (Linktree, Newspack), and token-audience confusion (Argo CD CVE-2023-22482). For standalone JWT signature/crypto forging (alg:none, key confusion, kid/jku) see hunt-jwt-crypto; this skill covers JWT only inside SSO/SAML/token-trust bypass chains. SAML assertion-layer attacks (XSW, comment injection, signature stripping, XXE-in-assertion) are owned by hunt-saml; this skill owns the broader cross-protocol auth-bypass taxonomy. Use when hunting auth bypass — see the Legacy-Protocol Matrix for branded-UI vs legacy-endpoint patterns.
tags: [bug-bounty, security-testing, hunt, auth, bypass]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: authentication
---

# hunt-auth-bypass

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunting skill for auth bypass vulnerabilities. Built from 12 public bug bounty reports across SAML XSW / parser-differential (GitHub Enterprise CVE-2025-25291/25292), SAML signature stripping (Uber, Rocket.Chat, samlify CVE-2025-47949), SAML domain enforcement bypass via control characters (HackerOne 2024), partner-portal cross-IdP assertion reuse (Slack), WordPress XMLRPC bypassing SSO (Uber), JWT alg-confusion HS256/RS256 (Jitsi), JWT signature-validation skip (Linktree, Newspack), and token-audience confusion (Argo CD CVE-2023-22482). For standalone JWT signature/crypto forging (alg:none, key confusion, kid/jku) see hunt-jwt-crypto; this skill covers JWT only inside SSO/SAML/token-trust bypass chains. SAML assertion-layer attacks (XSW, comment injection, signature stripping, XXE-in-assertion) are owned by hunt-saml; this skill owns the broader cross-protocol auth-bypass taxonomy. Use when hunting auth bypass — see the Legacy-Protocol Matrix for branded-UI vs legacy-endpoint patterns.

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
