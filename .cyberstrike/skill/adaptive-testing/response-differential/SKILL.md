---
name: adaptive-response-differential
description: Compare baseline and variant responses to determine whether a transformation produced meaningful evidence.
category: adaptive-testing
version: "1.0.0"
author: CyberStrike
tags: [adaptive-testing, response-differential, evidence, validation]
tech_stack: [http, web]
cwe_ids: []
chains_with: [mutation-policy]
prerequisites: [adaptive-failure-analysis]
severity_boost: {}
---

# Adaptive Response Differential

## Purpose

Determine whether a variant changed application behavior in a meaningful, reproducible way.

## Compare

- Status and redirect behavior
- Response size and structure
- Error class and parser behavior
- Reflections or controlled markers
- Timing only when explicitly justified and reproducible
- Authentication and authorization context

## Rules

A response difference is not automatically a vulnerability. Preserve paired evidence and require reproducibility before promoting a hypothesis.
