---
name: hunt-xxe
description: Hunting skill for xxe vulnerabilities. Built from 10 public bug bounty reports including SVG-upload XXE, Office-doc (PPTX/DOCX) XXE, SOAP XXE, SAML AssertionConsumer XXE, blind OOB XXE via DTD callback, parameter-entity XXE, XXE-to-LFI, XXE-to-SSRF, and XXE-to-RCE chains (Adobe Commerce CosmicSting CVE-2024-34102). Use when hunting XXE on any target — emphasis on OOB-Or-It-Didn't-Happen Gate for blind cases.
tags: [bug-bounty, security-testing, hunt, xxe]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: input-validation
---

# hunt-xxe

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunting skill for xxe vulnerabilities. Built from 10 public bug bounty reports including SVG-upload XXE, Office-doc (PPTX/DOCX) XXE, SOAP XXE, SAML AssertionConsumer XXE, blind OOB XXE via DTD callback, parameter-entity XXE, XXE-to-LFI, XXE-to-SSRF, and XXE-to-RCE chains (Adobe Commerce CosmicSting CVE-2024-34102). Use when hunting XXE on any target — emphasis on OOB-Or-It-Didn't-Happen Gate for blind cases.

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
