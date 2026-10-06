---
name: hunt-k8s
description: Hunt Kubernetes & Docker — API anonymous access, kubelet 10250 exec (SPDY/WebSocket, NOT plain POST) and the simpler /run primitive, etcd 2379 unauth, dashboard skip-login, RBAC misconfig, secret/SA-token abuse, docker.sock host escape, runc/container-escape (Leaky Vessels CVE-2024-21626), API-server-mediated nodes/proxy RCE, EphemeralContainers node-shell, bound/projected SA-token audience+expiry abuse, admission-controller bypass, Helm/Tiller remnants. Use when target runs containerized infra, exposes K8s ports (6443/10250/10255/2379/8443), or cloud metadata reveals K8s service accounts.
tags: [bug-bounty, security-testing, hunt, k8s]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: platform-security
---

# hunt-k8s

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Hunt Kubernetes & Docker — API anonymous access, kubelet 10250 exec (SPDY/WebSocket, NOT plain POST) and the simpler /run primitive, etcd 2379 unauth, dashboard skip-login, RBAC misconfig, secret/SA-token abuse, docker.sock host escape, runc/container-escape (Leaky Vessels CVE-2024-21626), API-server-mediated nodes/proxy RCE, EphemeralContainers node-shell, bound/projected SA-token audience+expiry abuse, admission-controller bypass, Helm/Tiller remnants. Use when target runs containerized infra, exposes K8s ports (6443/10250/10255/2379/8443), or cloud metadata reveals K8s service accounts.

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
