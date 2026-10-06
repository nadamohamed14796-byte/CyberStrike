---
name: cloud-iam-deep
description: Cloud IAM red-team attack chain across AWS, Azure, GCP — focused on EXTERNAL exploitation paths and post-credential-discovery privilege analysis. Covers IAM enumeration (aws iam, az role, gcloud iam), STS/AssumeRole chaining, Azure Managed Identity abuse (via SSRF/leak), GCP service account JSON abuse, IMDSv1/v2 attacks via SSRF, K8s ServiceAccount token privilege analysis once held (token discovery / cluster exposure is owned by hunt-k8s), role-trust-policy confused-deputy, cross-account assume-role enumeration, IAM privilege escalation patterns (24+ AWS, 8+ Azure, 6+ GCP), and AWS Cognito Identity Pool unauthenticated-role attack chain (GetId → GetCredentialsForIdentity → IAM role abuse). Built for the case where recon yields a credential (key, JSON, token) and you need to know what it grants and how to escalate. Use when an AWS key / Azure secret / GCP service account JSON / K8s SA token surfaces from a code repo, JS bundle, APK, breach corpus, or SSRF chain.
tags: [bug-bounty, security-testing, cloud, iam, deep]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: platform-security
---

# cloud-iam-deep

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Cloud IAM red-team attack chain across AWS, Azure, GCP — focused on EXTERNAL exploitation paths and post-credential-discovery privilege analysis. Covers IAM enumeration (aws iam, az role, gcloud iam), STS/AssumeRole chaining, Azure Managed Identity abuse (via SSRF/leak), GCP service account JSON abuse, IMDSv1/v2 attacks via SSRF, K8s ServiceAccount token privilege analysis once held (token discovery / cluster exposure is owned by hunt-k8s), role-trust-policy confused-deputy, cross-account assume-role enumeration, IAM privilege escalation patterns (24+ AWS, 8+ Azure, 6+ GCP), and AWS Cognito Identity Pool unauthenticated-role attack chain (GetId → GetCredentialsForIdentity → IAM role abuse). Built for the case where recon yields a credential (key, JSON, token) and you need to know what it grants and how to escalate. Use when an AWS key / Azure secret / GCP service account JSON / K8s SA token surfaces from a code repo, JS bundle, APK, breach corpus, or SSRF chain.

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
