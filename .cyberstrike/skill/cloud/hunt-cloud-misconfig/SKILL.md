---
name: hunt-cloud-misconfig
description: "Hunt cloud / infrastructure misconfigurations. AWS: public S3 buckets (s3:GetObject anonymous), permissive bucket policies (PutObjectAcl public-write), exposed CloudFront origin, public Lambda function URL, public RDS snapshot, IAM credentials in JS bundles, AWS metadata accessible via SSRF. GCP: public GCS buckets, exposed Cloud Run services, leaked service account JSON. Azure: public blob containers, exposed Function App. (Kubernetes/Docker exposure is owned by hunt-k8s; CI/CD pipeline attacks by hunt-cicd; post-credential IAM escalation by cloud-iam-deep.) Detection: targeted dorking, certificate transparency, JS bundle secret extraction, port scan for known service ports. Validate: actual data read / write / RCE. Use when hunting cloud-native storage and compute misconfig (S3/GCS/Blob, IMDS-via-SSRF, serverless, public managed services)."
tags: [bug-bounty, security-testing, hunt, cloud, misconfig]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: platform-security
---

# hunt-cloud-misconfig

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt cloud / infrastructure misconfigurations. AWS: public S3 buckets (s3:GetObject anonymous), permissive bucket policies (PutObjectAcl public-write), exposed CloudFront origin, public Lambda function URL, public RDS snapshot, IAM credentials in JS bundles, AWS metadata accessible via SSRF. GCP: public GCS buckets, exposed Cloud Run services, leaked service account JSON. Azure: public blob containers, exposed Function App. (Kubernetes/Docker exposure is owned by hunt-k8s; CI/CD pipeline attacks by hunt-cicd; post-credential IAM escalation by cloud-iam-deep.) Detection: targeted dorking, certificate transparency, JS bundle secret extraction, port scan for known service ports. Validate: actual data read / write / RCE. Use when hunting cloud-native storage and compute misconfig (S3/GCS/Blob, IMDS-via-SSRF, serverless, public managed services).

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

---
## Signal-Driven Gate

Activate only on concrete cloud exposure evidence: a public bucket/blob/object, cloud service endpoint, metadata path, cloud credential artifact, exposed snapshot/function/service, cloud-backed DNS relationship, or provider-specific configuration signal.
Do not activate from generic cloud keywords, technology banners, or DNS names alone.
Use the least-invasive validation that proves the boundary. Separate discovery from impact and preserve negative evidence.
