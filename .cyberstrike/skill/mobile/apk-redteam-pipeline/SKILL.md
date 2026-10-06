---
name: apk-redteam-pipeline
description: End-to-end Android APK red-team pipeline — automated APK acquisition (Play Store + apkpure + apkmirror fallback), jadx decompilation, secret/URL/JWT/Firebase grep, pinned-cert extraction, exported-component enumeration, Frida runtime instrumentation templates, intent-injection probes. Built from an authorized external red-team engagement where 7 APKs were pulled manually, 4 download attempts truncated, and a hardcoded JWT + 30 internal API endpoints were recovered from one of the apps. Use when target has a mobile app catalogue (Play Store developer page), when you find an APK URL hosted on a web server, or when post-recon mentions 'mobile app' in scope.
tags: [bug-bounty, security-testing, apk, redteam, pipeline]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: mobile-security
---

# apk-redteam-pipeline

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
End-to-end Android APK red-team pipeline — automated APK acquisition (Play Store + apkpure + apkmirror fallback), jadx decompilation, secret/URL/JWT/Firebase grep, pinned-cert extraction, exported-component enumeration, Frida runtime instrumentation templates, intent-injection probes. Built from an authorized external red-team engagement where 7 APKs were pulled manually, 4 download attempts truncated, and a hardcoded JWT + 30 internal API endpoints were recovered from one of the apps. Use when target has a mobile app catalogue (Play Store developer page), when you find an APK URL hosted on a web server, or when post-recon mentions "mobile app" in scope.

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
