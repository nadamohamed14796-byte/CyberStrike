---
name: offensive-osint
description: Operational arsenal for authorized external red-team and bug-bounty recon. Concrete probes, wordlists, regexes, dorks, curl one-liners for: subdomain enum, GraphQL/Swagger/REST discovery, identity fabric (Entra/Okta/ADFS/Google/SAML/M365 deep — Teams/SharePoint/OneDrive), cloud bucket enum (S3/GCS/Azure), CDN/WAF bypass, origin discovery, vendor fingerprinting (Citrix/F5/Pulse/Fortinet/PaloAlto/Cisco/VMware), CI/CD exposure, 48-pattern secret-scan catalog (AWS/GCP/GitHub/Stripe/Slack/Anthropic/OpenAI/Atlassian/DataDog/npm/PyPI), Postman workspaces, breach correlation (HudsonRock/HIBP/DeHashed/IntelX), TLS/JA3 audit, certificate transparency, JS endpoint extraction, package registry leaks, mobile/APK recon, sat imagery, sector-specific recon (healthcare DICOM, finance SWIFT, ICS/SCADA Modbus/BACnet). Detail content in 15 modular reference files, loaded on demand. Use for any authorized recon: scoping, asset discovery, attack-path mapping, secret triage, severity scoring.
tags: [bug-bounty, security-testing, offensive, osint]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: reconnaissance
---

# offensive-osint

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Operational arsenal for authorized external red-team and bug-bounty recon. Concrete probes, wordlists, regexes, dorks, curl one-liners for: subdomain enum, GraphQL/Swagger/REST discovery, identity fabric (Entra/Okta/ADFS/Google/SAML/M365 deep — Teams/SharePoint/OneDrive), cloud bucket enum (S3/GCS/Azure), CDN/WAF bypass, origin discovery, vendor fingerprinting (Citrix/F5/Pulse/Fortinet/PaloAlto/Cisco/VMware), CI/CD exposure, 48-pattern secret-scan catalog (AWS/GCP/GitHub/Stripe/Slack/Anthropic/OpenAI/Atlassian/DataDog/npm/PyPI), Postman workspaces, breach correlation (HudsonRock/HIBP/DeHashed/IntelX), TLS/JA3 audit, certificate transparency, JS endpoint extraction, package registry leaks, mobile/APK recon, sat imagery, sector-specific recon (healthcare DICOM, finance SWIFT, ICS/SCADA Modbus/BACnet). Detail content in 15 modular reference files, loaded on demand. Use for any authorized recon: scoping, asset discovery, attack-path mapping, secret triage, severity scoring.

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
