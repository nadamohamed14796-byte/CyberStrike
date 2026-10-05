---
name: vmware-vcenter-attack
description: VMware vSphere / vCenter Server external attack matrix — version fingerprinting, the high-impact CVE chain (CVE-2021-21972 vRealize unauth file upload, CVE-2021-21985 vSAN plugin RCE, CVE-2022-22954 Workspace ONE SSTI, CVE-2023-20887 Aria RCE, CVE-2024-37085 ESXi AD bypass, CVE-2023-34048 vCenter DCERPC OOB write APT-exploited), default credentials, SSO configuration disclosure, vmdir LDAP enumeration, ESXi Open SLP RCE history. ONLY for vCenter / Workspace ONE / Aria instances exposed to the internet — internal-network vCenter is out of scope per the external-only boundary. Use when recon shows port 443 with vCenter banner, `/ui` redirect, `/websso/SAML2/Metadata`, or VMware product fingerprints.
tags: [bug-bounty, security-testing, vmware, vcenter, attack]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: platform-security
---

# vmware-vcenter-attack

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
VMware vSphere / vCenter Server external attack matrix — version fingerprinting, the high-impact CVE chain (CVE-2021-21972 vRealize unauth file upload, CVE-2021-21985 vSAN plugin RCE, CVE-2022-22954 Workspace ONE SSTI, CVE-2023-20887 Aria RCE, CVE-2024-37085 ESXi AD bypass, CVE-2023-34048 vCenter DCERPC OOB write APT-exploited), default credentials, SSO configuration disclosure, vmdir LDAP enumeration, ESXi Open SLP RCE history. ONLY for vCenter / Workspace ONE / Aria instances exposed to the internet — internal-network vCenter is out of scope per the external-only boundary. Use when recon shows port 443 with vCenter banner, `/ui` redirect, `/websso/SAML2/Metadata`, or VMware product fingerprints.

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
