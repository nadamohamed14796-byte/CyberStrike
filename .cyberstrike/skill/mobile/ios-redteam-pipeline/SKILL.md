---
name: ios-redteam-pipeline
description: End-to-end iOS red-team pipeline — IPA acquisition (App Store extraction, TestFlight, enterprise/ad-hoc sideload), class-dump/Hopper/Ghidra static analysis, Info.plist + entitlements + Keychain secret extraction, App Transport Security (ATS) misconfig + certificate-pinning bypass (frida-ios-dump, objection, SSL Kill Switch 2), URL-scheme / Universal Link hijack, exported-service enumeration, Frida runtime instrumentation. Companion to apk-redteam-pipeline for the iOS side of a mobile app catalogue. Use when target has an iOS app (App Store listing, TestFlight link, enterprise MDM distribution), when an IPA URL is found hosted on a web server, or when post-recon mentions 'iOS app' / 'mobile app' in scope alongside an Apple developer account.
tags: [bug-bounty, security-testing, ios, redteam, pipeline]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: mobile-security
---

# ios-redteam-pipeline

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
End-to-end iOS red-team pipeline — IPA acquisition (App Store extraction, TestFlight, enterprise/ad-hoc sideload), class-dump/Hopper/Ghidra static analysis, Info.plist + entitlements + Keychain secret extraction, App Transport Security (ATS) misconfig + certificate-pinning bypass (frida-ios-dump, objection, SSL Kill Switch 2), URL-scheme / Universal Link hijack, exported-service enumeration, Frida runtime instrumentation. Companion to apk-redteam-pipeline for the iOS side of a mobile app catalogue. Use when target has an iOS app (App Store listing, TestFlight link, enterprise MDM distribution), when an IPA URL is found hosted on a web server, or when post-recon mentions "iOS app" / "mobile app" in scope alongside an Apple developer account.

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
