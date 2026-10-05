---
name: enterprise-vpn-attack
description: External SSL VPN / remote-access appliance attack matrix — Cisco ASA/AnyConnect, Fortinet FortiGate/FortiOS, Citrix NetScaler/ADC, Palo Alto GlobalProtect, Pulse Secure / Ivanti Connect Secure, SonicWall, F5 Big-IP. Covers version fingerprinting, CVE matrix (2018-2026), AAA backend identification, default credentials, configuration-disclosure paths, pre-auth RCE/SSRF/path-traversal exploits where applicable. Built from authorized-engagement Cisco ASA testing plus 2024-2026 enterprise VPN CVE landscape. Use whenever the target's perimeter exposes any SSL VPN appliance or remote-access gateway — these are the most common initial-access points in 2024-2026 actor TTPs.
tags: [bug-bounty, security-testing, enterprise, vpn, attack]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: platform-security
---

# enterprise-vpn-attack

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
External SSL VPN / remote-access appliance attack matrix — Cisco ASA/AnyConnect, Fortinet FortiGate/FortiOS, Citrix NetScaler/ADC, Palo Alto GlobalProtect, Pulse Secure / Ivanti Connect Secure, SonicWall, F5 Big-IP. Covers version fingerprinting, CVE matrix (2018-2026), AAA backend identification, default credentials, configuration-disclosure paths, pre-auth RCE/SSRF/path-traversal exploits where applicable. Built from authorized-engagement Cisco ASA testing plus 2024-2026 enterprise VPN CVE landscape. Use whenever the target's perimeter exposes any SSL VPN appliance or remote-access gateway — these are the most common initial-access points in 2024-2026 actor TTPs.

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
