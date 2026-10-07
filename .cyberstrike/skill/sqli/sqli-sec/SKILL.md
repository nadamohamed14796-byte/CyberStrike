---
name: sqli-sec
description: Signal-driven database query security orchestration.
category: input-validation
verified: official
tags: [sqli, database, injection, signal-driven, evidence]
chains_with:
  - hunt-sqli
  - nosql
  - offensive-sqli
  - sqli-sql-injection
files: [SKILL.md]
---

# SQL Query Security Router

Activate only when a concrete query/data-flow signal is observed, such as controlled
input reaching a database query boundary, reproducible query differential behavior,
or confirmed database-layer error behavior.

Generic database presence, parameter names, scanner labels, or a single error string
are not sufficient.

## Evidence lifecycle
signal -> query-context-confirmed -> behavior-observed -> controlled-reproduction ->
impact-proven -> finding

Preserve target, endpoint, parameter, database context, identity, provenance, baseline,
controlled mutation, result, impact, and negative results. Deduplicate by target +
endpoint + parameter + query context + impact-class.

## Safety
Use authorized labs, owned applications, or explicitly scoped assessments. Prefer
non-destructive validation and synthetic data.
