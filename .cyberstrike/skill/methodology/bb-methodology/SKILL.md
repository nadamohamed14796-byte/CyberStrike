---
name: bb-methodology
description: Compatibility entry point for the unified methodology skill. Use at the start of a bug bounty hunt, when switching targets, or when deciding what to do next. The canonical workflow, scope gate, evidence gate, target-context correlation, and skill routing live in ../SKILL.md. Load security-arsenal separately only when concrete payloads or bypass references are needed.
tags: [bug-bounty, security-testing, methodology, compatibility]
version: "2.0"
category: methodology
---

# Bug Bounty Methodology — Compatibility Entry Point

This skill name is retained so existing references and triggers continue to work.

Use the canonical methodology at [../SKILL.md](../SKILL.md) for the complete workflow:
- scope and authorization checks;
- target-level context and cross-layer correlation;
- phase selection and hypothesis-driven testing;
- false-positive/evidence gates;
- vulnerability-chain validation and reporting handoff;
- safety and learning rules.

Do not duplicate the canonical workflow here. Follow it as the single source of truth. Load `security-arsenal` only when a concrete test needs payloads, bypass tables, wordlists, or patterns.
