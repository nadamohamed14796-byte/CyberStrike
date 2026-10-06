---
name: osint-methodology
description: Comprehensive OSINT methodology for external red-team operations and authorized attack-surface assessments. Covers the 5-stage recon pipeline (seed discovery, asset expansion, enrichment, exposure analysis, reporting), asset-graph discipline with 29 asset types, severity rubric (CRITICAL/HIGH/MEDIUM/LOW/INFO), confidence upgrade workflows, time budgeting, asset-level triage rules, scale-based tactics, identity-fabric mapping (Entra/Okta/ADFS/Google/SAML/M365 Teams+SharePoint+OAuth), API and auth-map methodology, JavaScript deep analysis, mobile attack surface, cloud attack surface, breach×identity correlation, detectability tagging, detection-aware probing (back-off, persona rotation), read-only validator discipline, WAF/CDN bypass + origin discovery, vulnerability prioritization (CVE/EPSS/KEV), phishing infrastructure planning + pretext development, bug bounty submission templates, client deliverable templates with risk translation, threat-actor investigation (incl. RU/CN pivots), cryptocurrency tracing, image/video forensics, chronolocation. Use when planning or executing reconnaissance against authorized targets, mapping an organization's external attack surface, investigating a person/entity, tracing crypto flows, geolocating media, or performing attribution work.
tags: [bug-bounty, security-testing, osint, methodology]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reconnaissance
---

# osint-methodology

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Comprehensive OSINT methodology for external red-team operations and authorized attack-surface assessments. Covers the 5-stage recon pipeline (seed discovery, asset expansion, enrichment, exposure analysis, reporting), asset-graph discipline with 29 asset types, severity rubric (CRITICAL/HIGH/MEDIUM/LOW/INFO), confidence upgrade workflows, time budgeting, asset-level triage rules, scale-based tactics, identity-fabric mapping (Entra/Okta/ADFS/Google/SAML/M365 Teams+SharePoint+OAuth), API and auth-map methodology, JavaScript deep analysis, mobile attack surface, cloud attack surface, breach×identity correlation, detectability tagging, detection-aware probing (back-off, persona rotation), read-only validator discipline, WAF/CDN bypass + origin discovery, vulnerability prioritization (CVE/EPSS/KEV), phishing infrastructure planning + pretext development, bug bounty submission templates, client deliverable templates with risk translation, threat-actor investigation (incl. RU/CN pivots), cryptocurrency tracing, image/video forensics, chronolocation. Use when planning or executing reconnaissance against authorized targets, mapping an organization's external attack surface, investigating a person/entity, tracing crypto flows, geolocating media, or performing attribution work.

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
