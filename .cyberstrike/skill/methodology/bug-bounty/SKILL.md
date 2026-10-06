---
name: bug-bounty
description: Complete bug bounty workflow — recon (subdomain enumeration, asset discovery, fingerprinting, HackerOne scope, source code audit), pre-hunt learning (disclosed reports, tech stack research, mind maps, threat modeling), vulnerability hunting (IDOR, SSRF, XSS, auth bypass, CSRF, race conditions, SQLi, XXE, file upload, business logic, GraphQL, HTTP smuggling, cache poisoning, OAuth, timing side-channels, OIDC, SSTI, subdomain takeover, cloud misconfig, ATO chains, agentic AI), LLM/AI security testing (chatbot IDOR, prompt injection, indirect injection, ASCII smuggling, exfil channels, RCE via code tools, system prompt extraction, ASI01-ASI10), A-to-B bug chaining (IDOR→auth bypass, SSRF→cloud metadata, XSS→ATO, open redirect→OAuth theft, S3→bundle→secret→OAuth), bypass tables (SSRF IP bypass, open redirect bypass, file upload bypass), language-specific grep (JS prototype pollution, Python pickle, PHP type juggling, Go template.HTML, Ruby YAML.load, Rust unwrap), and reporting (7-Question Gate, 4 validation gates, human-tone writing, templates by vuln class, CVSS 3.1, PoC generation, always-rejected list, conditional chain table, submission checklist). Use for ANY bug bounty task — starting a new target, doing recon, hunting specific vulns, auditing source code, testing AI features, validating findings, or writing reports. 中文触发词：漏洞赏金、安全测试、渗透测试、漏洞挖掘、信息收集、子域名枚举、XSS测试、SQL注入、SSRF、安全审计、漏洞报告
tags: [bug-bounty, security-testing, bug, bounty]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reconnaissance
---

# bug-bounty

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Complete bug bounty workflow — recon (subdomain enumeration, asset discovery, fingerprinting, HackerOne scope, source code audit), pre-hunt learning (disclosed reports, tech stack research, mind maps, threat modeling), vulnerability hunting (IDOR, SSRF, XSS, auth bypass, CSRF, race conditions, SQLi, XXE, file upload, business logic, GraphQL, HTTP smuggling, cache poisoning, OAuth, timing side-channels, OIDC, SSTI, subdomain takeover, cloud misconfig, ATO chains, agentic AI), LLM/AI security testing (chatbot IDOR, prompt injection, indirect injection, ASCII smuggling, exfil channels, RCE via code tools, system prompt extraction, ASI01-ASI10), A-to-B bug chaining (IDOR→auth bypass, SSRF→cloud metadata, XSS→ATO, open redirect→OAuth theft, S3→bundle→secret→OAuth), bypass tables (SSRF IP bypass, open redirect bypass, file upload bypass), language-specific grep (JS prototype pollution, Python pickle, PHP type juggling, Go template.HTML, Ruby YAML.load, Rust unwrap), and reporting (7-Question Gate, 4 validation gates, human-tone writing, templates by vuln class, CVSS 3.1, PoC generation, always-rejected list, conditional chain table, submission checklist). Use for ANY bug bounty task — starting a new target, doing recon, hunting specific vulns, auditing source code, testing AI features, validating findings, or writing reports. 中文触发词：漏洞赏金、安全测试、渗透测试、漏洞挖掘、信息收集、子域名枚举、XSS测试、SQL注入、SSRF、安全审计、漏洞报告

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
