---
name: cloud-sec
description: Signal-driven cloud security orchestration for AWS, Azure, GCP, Kubernetes, container, IAM, and cloud misconfiguration workflows.
category: platform-security
tags: [cloud, aws, azure, gcp, kubernetes, iam, misconfig, orchestration]
tech_stack: [aws, azure, gcp, kubernetes]
cwe_ids: [CWE-269, CWE-284, CWE-311, CWE-522]
version: "1.0"
chains_with: [cloud-assessment, hunt-cloud-misconfig, cloud-iam-deep, hunt-k8s, vmware-vcenter-attack]
---

# Cloud Security Orchestrator

`cloud-sec` is the cloud routing layer. It does not replace existing cloud skills and must not launch the whole cloud directory because a target merely contains a cloud keyword.

## Activation Gate

Require at least one concrete signal:
- AWS, Azure, or GCP asset/service fingerprint observed.
- Cloud storage endpoint, bucket, blob, object store, or signed URL observed.
- Cloud metadata/identity endpoint observed, including a concrete SSRF-to-metadata hypothesis.
- Cloud credential artifact observed in authorized scope: access key, service-account JSON, workload identity token, managed-identity token, kubeconfig, or equivalent.
- IAM/RBAC role, policy, trust relationship, service principal, managed identity, or permission boundary observed.
- Kubernetes API, kubelet, service-account token, cluster endpoint, pod/service/ingress, or container runtime evidence observed.
- Concrete cloud misconfiguration signal such as public storage, public management plane, exposed snapshot, overly permissive network rule, exposed function/service, or dangling cloud-backed DNS.
- VMware vCenter/cloud virtualization fingerprint observed.

Do not activate on generic words such as `cloud`, `AWS`, `Azure`, `GCP`, or `Kubernetes` without an observed asset or technical signal.

## Routing Matrix

| Signal | Canonical specialist |
|---|---|
| Read-only posture/compliance/account inventory | `cloud-assessment` |
| Public storage, exposed managed service, cloud misconfiguration | `hunt-cloud-misconfig` |
| Concrete cloud credential or IAM permission artifact | `cloud-iam-deep` |
| Kubernetes API/RBAC/pod/service-account evidence | `hunt-k8s` |
| Kubernetes assessment/compliance | `k8s-assessment` |
| Kubernetes offensive testing after concrete authorization/evidence | `kubernetes-pentesting` |
| Kubernetes/cloud attack chain | `offensive-k8s-attacks` |
| Container escape signal | `container-escape-techniques` / `offensive-container-escape` |
| Sandbox escape signal | `sandbox-escape-techniques` |
| VMware vCenter signal | `vmware-vcenter-attack` |
| AWS/Azure post-compromise credential context | `aws-postexploit` / `azure-postexploit` |
| Broad cloud offensive methodology | `offensive-cloud`, only after a concrete cloud attack-surface signal |

## Provider Identification

Normalize provider evidence before routing:
- AWS: `amazonaws.com`, AWS service names, ARN, STS, S3, EC2 metadata.
- Azure: `azure.com`, `windows.net`, Entra/Graph, ARM, managed identity.
- GCP: `googleapis.com`, GCP project/service-account artifacts, metadata server.
- Kubernetes: API server, kubelet, service-account token, kubeconfig, cluster-specific headers/paths.

Do not infer provider solely from a hostname fragment when stronger evidence is available.

## Safety and Authorization

Before any cloud action:
1. Confirm target/account/resource is authorized.
2. Establish identity and scope.
3. Prefer read-only enumeration first.
4. For `cloud-assessment`, `verify_readonly` is mandatory before audit programs.
5. Never treat possession of a credential as permission to use it outside the declared scope.
6. Avoid persistence, destructive changes, broad data collection, or exfiltration unless explicitly authorized.
7. Use synthetic/test resources where possible.

## Evidence Lifecycle

Use: `signal → candidate → observed → validated → impact-proven → finding`

Scanner output, version strings, public DNS, a cloud banner, or a permission name alone are never findings.

## Shared Cloud Inventory

Maintain one normalized inventory across specialists:
- provider
- account/subscription/project
- resource type
- resource identifier
- region/zone
- public/private exposure
- identity/role context
- source artifact
- observed permissions
- related endpoint
- timestamp
- signal
- evidence state
- specialist history
- scope decision

Do not make each cloud skill create an independent asset inventory.

## Handoff Contract

Every handoff must contain:
- scope and target;
- provider/account/project/subscription;
- canonical resource;
- identity/credential context;
- exact triggering signal;
- source artifact;
- previous actions;
- evidence state;
- unanswered security question;
- expected evidence;
- safety constraints.

## Deduplication and Bounds

- One canonical resource record per provider + account + resource ID.
- Reuse prior identity and enumeration artifacts.
- Do not run multiple specialists for the same unanswered question.
- Maximum three specialist handoffs from one cloud signal unless new evidence appears.
- Prefer one primary enumeration source before a secondary source.
- Preserve partial results on tool failure.
- Stop when the security question is answered or no new evidence can be obtained safely.

## External Resources

Use external references only when the concrete signal requires them. Prefer CIS Benchmarks, OWASP Cloud Security guidance, AWS/Azure/GCP official documentation, Kubernetes official security documentation, and ProjectDiscovery/Assetnote resources for externally observable cloud assets.

External resource output is supporting evidence, not a finding, and must retain provenance.

## Non-duplication

Existing specialists remain authoritative. `cloud-sec` routes; it does not copy their commands, payloads, or full methodologies. Existing files and paths are preserved for compatibility.