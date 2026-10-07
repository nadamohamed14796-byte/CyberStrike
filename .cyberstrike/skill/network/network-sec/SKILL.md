---
name: network-sec
description: Signal-driven network security orchestration and evidence routing.
category: security-orchestration
verified: official
tags: [network, signal-driven, evidence, routing]
chains_with:
  - enterprise-vpn-attack
  - hunt-tls-network
  - network-protocol-attacks
  - offensive-network-attacks
  - offensive-tls-attacks
  - traffic-analysis-pcap
  - tunneling-and-pivoting
files: [SKILL.md]
---

# network Security Router

Activate only from concrete network evidence. Generic topic words, scanner labels, version strings, or technology presence alone are not activation signals.

## Routing
- enterprise-vpn-attack
- hunt-tls-network
- network-protocol-attacks
- offensive-network-attacks
- offensive-tls-attacks
- traffic-analysis-pcap
- tunneling-and-pivoting

## Evidence gate
signal -> context-confirmed -> behavior-observed -> controlled-reproduction -> impact-proven -> finding

Record target, trigger, scope/identity, version/runtime, provenance, baseline, controlled test, result, impact, and negative results. Reuse evidence and deduplicate by target + component + specialist + trigger + context + impact-class.

## Safety
Use authorized labs, owned systems, or explicitly scoped engagements. Prefer reversible, minimal-impact validation.
