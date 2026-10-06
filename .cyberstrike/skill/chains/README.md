# Skill Chain Registry

This directory is the centralized policy layer for CyberStrike skill chaining.

## Source of truth

Individual skills remain authoritative for their existing:

- `chains_with`
- `prerequisites`
- `severity_boost`

Nothing is moved or deleted. The chain runtime reads those relationships through `SkillIndex` and applies the policies defined here.

## Runtime guarantees

The chain runtime must:

1. validate that every referenced skill exists before scheduling it;
2. deduplicate repeated handoffs;
3. prevent cycles and self-loops within a single chain execution;
4. require prerequisite skills to be satisfied before a target is eligible;
5. preserve the evidence context that caused a transition;
6. bound the number of automatic transitions;
7. stop when no new evidence or eligible skill remains;
8. never treat a chain relationship by itself as proof of a vulnerability.

The registry is intentionally policy-only. It must not become a second copy of every skill's metadata.

## Chain lifecycle

`signal -> candidate -> observed -> validated -> handoff -> validated -> finding`

A chain edge is a routing hint, not an automatic finding or an unconditional command execution.
