---
name: meme-coin-audit
description: Meme coin and token security audit — rug pull detection (honeypot, hidden mint, fee manipulation, LP lock bypass), Solana SPL token analysis (freeze authority, mint authority, metadata mutability), Token-2022 extension risks (transfer hooks, permanent delegate), DEX liquidity pool attacks (sandwich amplification, LP drain, bonding curve exploits), pump.fun/Raydium/Jupiter integration risks, and real exploit examples from 2024-2025. Use for any token audit, rug pull assessment, meme coin security review, or pre-investment due diligence.
tags: [bug-bounty, security-testing, meme, coin, audit]
version: "1.0-adapted"
source: "Claude-BugHunter"
category: web3-security
---

# meme-coin-audit

## Purpose
Adapted from the public Claude-BugHunter capability catalog for CyberStrike's signal-driven skill system.

## Trigger
Meme coin and token security audit — rug pull detection (honeypot, hidden mint, fee manipulation, LP lock bypass), Solana SPL token analysis (freeze authority, mint authority, metadata mutability), Token-2022 extension risks (transfer hooks, permanent delegate), DEX liquidity pool attacks (sandwich amplification, LP drain, bonding curve exploits), pump.fun/Raydium/Jupiter integration risks, and real exploit examples from 2024-2025. Use for any token audit, rug pull assessment, meme coin security review, or pre-investment due diligence.

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
