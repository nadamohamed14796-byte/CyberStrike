---
name: ai-ml-security
description: >-
  Signal-driven AI/ML security assessment covering model supply chain, adversarial robustness,
  poisoning, extraction, privacy, LLM, and agentic AI risks. Activate only when concrete evidence
  shows an AI or ML component is present in scope.
category: ai-security
version: "2.1.0"
author: CyberStrike
tags: [ai-security, ai-ml, machine-learning, model-security, llm, agents, supply-chain, privacy, resources]
tech_stack: [ai, ml, llm, python, http, api]
cwe_ids: [CWE-502, CWE-494, CWE-1104]

activation:
  mode: signal-driven
  confidence_threshold: 0.70
  signals:
    - ai-model-surface
    - ml-model-surface
    - model-file-discovered
    - model-serving-api
    - huggingface-model
    - pytorch-model
    - safetensors-model
    - trust-remote-code
    - ml-pipeline
    - training-pipeline
    - federated-learning
    - model-extraction-signal
    - model-poisoning-signal
    - model-privacy-signal
    - llm-surface
    - ai-agent-surface
    - ai-tool-use-surface
  negative_signals:
    - static-web-only
    - non-ai-application
  require_surface_evidence: true
  require_registered_subskill: true

routing:
  max_primary_domain: 1
  max_supporting_skills: 2
  prefer_specialized_skills: true
  deduplicate_by_canonical_skill: true
  keyword_only_activation: false

budget:
  max_initial_checks: 5
  max_followups: 3
  stop_on_no_information_gain: true
  stop_on_missing_evidence: true

validation:
  require_provenance: true
  require_reproducibility_for_security_relevance: true
  exploitability_requires_separate_validation: true

resources:
  policy:
    mode: signal-driven
    external_resources_are_reference_only: true
    require_scope_before_active_testing: true
    prefer_official_sources: true
    prefer_specialized_resource: true
    max_resources_per_handoff: 4
    max_tool_runs_per_handoff: 2
    require_evidence_for_tool_selection: true
    never_treat_resource_output_as_finding: true
  collections:
    - id: ai-frameworks
      when_signals: [ai-model-surface, ml-model-surface, ml-pipeline]
      resources:
        - name: OWASP GenAI Security Project
          type: framework
          url: https://genai.owasp.org/
          use_for: threat-modeling, AI/ML security taxonomy, red-team guidance
        - name: OWASP GenAI LLM Top 10 2026
          type: guide
          url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
          use_for: LLM and GenAI risk triage
        - name: MITRE ATLAS
          type: framework
          url: https://atlas.mitre.org/
          use_for: adversarial AI technique mapping
    - id: ai-red-team
      when_signals: [llm-surface, ai-agent-surface, ai-tool-use-surface]
      resources:
        - name: garak
          type: tool
          url: https://github.com/NVIDIA/garak
          use_for: bounded LLM vulnerability probing
          command_hint: python -m garak --help
        - name: PyRIT
          type: tool
          url: https://github.com/microsoft/PyRIT
          use_for: controlled generative-AI red teaming and multi-turn assessment
        - name: OWASP GenAI Red Teaming
          type: methodology
          url: https://genai.owasp.org/initiatives/
          use_for: AI red-team methodology and evaluation guidance
    - id: model-supply-chain
      when_signals: [model-file-discovered, pytorch-model, huggingface-model, trust-remote-code]
      resources:
        - name: Fickling
          type: tool
          url: https://github.com/trailofbits/fickling
          use_for: static analysis of pickle and pickle-based model files
          command_hint: python -m fickling --help
        - name: ModelScan
          type: tool
          url: https://github.com/protectai/modelscan
          use_for: model serialization safety scanning
          command_hint: modelscan --help
        - name: OWASP AI security resources
          type: framework
          url: https://genai.owasp.org/initiatives/
          use_for: supply-chain and AI security context
    - id: adversarial-ml
      when_signals: [ml-model-surface, model-extraction-signal, model-poisoning-signal, model-privacy-signal]
      resources:
        - name: Adversarial Robustness Toolbox
          type: tool
          url: https://github.com/Trusted-AI/adversarial-robustness-toolbox
          use_for: bounded evaluation of evasion, poisoning, extraction, and inference threats
          command_hint: python -m pip install adversarial-robustness-toolbox
  external-skill-repositories:
    - name: HACK.SKILLS
      type: skill-library
      url: https://github.com/yaklang/hack-skills
      use_for: cross-checking routing ideas and specialized security skill coverage
      policy: reference_and_adapt_not_copy
    - name: ProjectDiscovery Nuclei Templates
      type: detection-library
      url: https://github.com/projectdiscovery/nuclei-templates
      use_for: corroborating web exposure and vulnerability-detection coverage
      policy: execute_only_when_target_and_template_scope_match
    - name: Assetnote Wordlists
      type: wordlists
      url: https://github.com/assetnote/wordlists
      use_for: bounded content and subdomain discovery when relevant
      policy: use_only_for_authorized_scope
  selection:
    - If an exact specialized skill exists locally, use it before external skill text.
    - Use external resources to fill a knowledge/tooling gap, not to bypass local routing.
    - Prefer official project documentation or repositories over third-party writeups.
    - Record resource_id, reason, version/date if available, and resulting evidence refs.
    - Never import external payloads or instructions wholesale into runtime.
    - External resource failure must not create a finding or trigger an unbounded retry.
---

# AI/ML Security

## Purpose

Provide a signal-driven routing and assessment layer for AI/ML security.

This skill is a domain router and assessment framework, not a reason to load every AI/ML attack technique. It should be activated only when there is concrete evidence that the target exposes an AI or ML surface.

Required flow:

surface signal → scope/auth gate → identify AI/ML component → select specialized skill → select bounded resource/tool → test → evidence validation → handoff or stop

## Activation Gate

Activate only when there is concrete evidence of an AI/ML surface, such as:

- model files or model-serving endpoints;
- ML inference APIs;
- Hugging Face or model registry references;
- PyTorch/TensorFlow/ONNX/SafeTensors artifacts;
- training or evaluation pipelines;
- federated-learning infrastructure;
- LLM/chatbot endpoints;
- AI agent/tool-use workflows;
- model-specific configuration or deployment metadata.

Do not activate because the application includes generic JavaScript, a normal JSON API, or marketing text mentioning AI without clear evidence.

## Routing Matrix

| Evidence signal | Route |
|---|---|
| Model file / unsafe serialization | model-supply-chain or deserialization skill |
| Hugging Face / external model source | model-supply-chain |
| `trust_remote_code` / custom model code | model-supply-chain |
| Training pipeline / untrusted training data | model-poisoning |
| Federated learning | federated-learning security skill |
| Classification/inference API | adversarial-robustness |
| LLM/chatbot | `llm-prompt-injection` and related LLM skills |
| Autonomous agent with tools | agent-security |
| No specialized evidence | stop or perform a bounded discovery action |

## Safety and Quality Rules

- Preserve authorization and scope as hard gates.
- Never treat marketing language as technical evidence.
- Do not claim RCE from a model format without an unsafe load or execution path.
- Do not claim model extraction from query volume alone.
- Do not claim privacy impact without sensitive-data evidence.
- Prefer local specialized skills over broad routing.
- External resources may inform a hypothesis but cannot create a finding without validation.
- Stop when evidence or information gain is insufficient.
---

# Research Checklist

- Confirm authorization and scope.
- Confirm the AI/ML surface.
- Select the smallest relevant specialized skill.
- Use bounded resources only when justified.
- Record provenance and evidence.
- Validate before reporting a vulnerability.
