---
name: ai-ml-security
description: >-
  Signal-driven AI/ML security assessment covering model supply chain, adversarial robustness, poisoning, extraction, privacy, LLM, and agent-security risks. Activate only when target evidence indicates an AI/ML surface.
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

This skill is a **domain router and assessment framework**, not a reason to load every AI/ML attack technique. The runtime should activate it only when observable target evidence indicates an AI/ML surface.

Required flow:

`surface signal → scope/auth gate → identify AI/ML component → select specialized skill → select bounded resource/tool → test → evidence validation → handoff or stop`

## Resource-Assisted Assessment

External resources are **on-demand references**, not automatic skill activation.

Before using one:

1. Confirm the AI/ML signal.
2. Confirm authorization and scope.
3. Select the smallest relevant resource collection.
4. Prefer a local specialized skill when one already covers the task.
5. Run at most the bounded tool budget.
6. Store provenance and output references.
7. Feed only validated observations into the normal evidence pipeline.

Resource output is never a vulnerability finding by itself.

## Resource Selection Examples

```
model-file-discovered
  → model-supply-chain
  → Fickling / ModelScan
  → validate unsafe-load hypothesis
```

```
llm-surface
  → llm-prompt-injection
  → garak or PyRIT when justified
  → response/evidence validation
```

```
ml-model-surface + model-privacy-signal
  → model-privacy
  → ART or a specialized local skill
  → bounded privacy hypothesis test
```

```
unknown web target
  → do not load AI resources
  → continue normal target-surface discovery
```

Do not execute all resources in a collection automatically.

## Activation Gate

Activate only when there is concrete evidence of an AI/ML surface, such as:

- model files or model-serving endpoints;
- ML inference APIs;
- Hugging Face/model registry references;
- PyTorch/TensorFlow/ONNX/SafeTensors artifacts;
- training or evaluation pipelines;
- federated-learning infrastructure;
- LLM/chatbot endpoints;
- AI agent/tool-use workflows;
- model-specific configuration or deployment metadata.

Do **not** activate because:

- the application contains generic JavaScript;
- a normal API returns JSON;
- the application uses the word "AI" in marketing copy only;
- an endpoint contains a generic `model` parameter without corroborating evidence;
- a scanner labels something "AI" without supporting evidence.

If the evidence is weak, remain inactive or request a narrowly scoped discovery step.

## Required Inputs

Before assessment, require:

- authorization and scope;
- target/endpoint or artifact reference;
- AI/ML surface evidence;
- triggering signal;
- authentication/session context when relevant;
- provenance of the observed artifact;
- current test budget.

When available, also consume:

- technology fingerprints;
- model format;
- deployment metadata;
- API behavior;
- model registry references;
- existing findings;
- account/tenant context;
- previous test results.

Missing required evidence means `stop`, not speculative testing.

## Routing Matrix

| Evidence signal | Route |
|---|---|
| Model file / unsafe serialization | model-supply-chain or deserialization skill |
| Hugging Face / external model source | model-supply-chain |
| `trust_remote_code` / custom model code | model-supply-chain |
| Training pipeline / untrusted training data | model-poisoning |
| Federated learning | federated-learning security skill |
| Classification/inference API | adversarial-robustness |
| Repeated-query behavioral similarity signal | model-extraction |
| Sensitive training data / privacy concern | model-privacy |
| LLM/chatbot | `llm-prompt-injection` and other registered LLM skills |
| Autonomous agent with tools | agent-security |
| AI API with external tool access | agent/tool-use security |
| No specialized evidence | stop or perform one bounded discovery action |

The router must prefer a registered specialized skill over this broad skill when both match.

## Specialized Routing Rules

The runtime should emit a new routing signal rather than loading all branches simultaneously.

A broad AI/ML signal must **not** activate every AI/ML technique.

## Assessment Domains

### 1. Model Supply Chain

Assess only when model artifacts or model-loading infrastructure are present.

Look for:

- unsafe serialization formats;
- untrusted model provenance;
- executable/custom model code;
- remote-code loading;
- dependency confusion in ML pipelines;
- integrity/signature gaps;
- unsafe model download/load paths.

Do not claim code execution from file format alone. Require evidence of an unsafe load path or equivalent execution behavior.

### 2. Adversarial Robustness

Assess when an inference/classification surface is confirmed.

Record:

- model input type;
- attacker control;
- prediction/output behavior;
- baseline behavior;
- perturbation constraints;
- reproducibility.

Use bounded tests appropriate to the authorized environment. Do not equate any misclassification with a security vulnerability.

### 3. Model Poisoning

Assess only when the researcher can legitimately influence:

- training data;
- model updates;
- labels;
- federated updates;
- model artifacts;
- training dependencies.

Separate availability/quality degradation from security impact.

### 4. Model Extraction

Require an observable model API and evidence that query behavior can reveal model-specific information.

Track:

- query budget;
- returned output granularity;
- confidence/probability exposure;
- rate limits;
- response similarity;
- reproducibility.

Do not assume a fixed query count is universally sufficient.

### 5. Model Privacy

Potential areas:

- membership inference;
- model inversion;
- training-data exposure;
- gradient leakage;
- sensitive output leakage.

Require evidence that the data is sensitive and that the model/API behavior supports the hypothesis.

### 6. LLM Security

Route detailed LLM testing to registered specialized skills.

Potential signals:

- prompt injection;
- indirect prompt injection;
- system-instruction exposure;
- unsafe tool use;
- sensitive data disclosure;
- cross-tenant/context leakage.

Do not duplicate detailed payload libraries here.

### 7. Agent Security

When an autonomous agent is confirmed, inspect:

- available tools;
- authorization boundaries;
- tool argument validation;
- confirmation requirements;
- external-content trust;
- inter-agent trust;
- data-flow boundaries;
- side-effect permissions.

A tool invocation alone is not proof of privilege escalation or data exfiltration.

## Evidence Model

Produce:

```
ai_ml_assessment:
  outcome: no-signal | candidate | routed | validated | inconclusive
  surface:
    type: <ai|ml|llm|agent|pipeline|model-artifact>
    evidence_refs:
      - <ref>
  signal:
    name: <signal>
    confidence: 0.00
  scope:
    status: in-scope | out-of-scope | unknown
  primary_route:
    skill: <registered-skill-or-null>
    reason: <reason>
  supporting_routes:
    - skill: <registered-skill>
      reason: <reason>
  resource_refs:
    - resource_id: <id>
      reason: <why>
      output_refs:
        - <ref>
  observations:
    - <fact>
  hypotheses:
    - <hypothesis>
  test_budget:
    initial_checks: <integer>
    followups: <integer>
    tool_runs: <integer>
  next_action:
    type: route | resource | bounded-discovery | validate | stop
    reason: <reason>
```

Confidence represents evidence for the AI/ML surface or routing decision. It is not exploitability or severity.

## Handoff Contract

When routing to a specialized skill or resource-assisted workflow, preserve:

- `ai_ml_assessment`;
- original signal;
- surface evidence;
- scope/auth state;
- artifact/endpoint references;
- account/session context;
- prior observations;
- hypotheses;
- resource references and provenance;
- test budget.

The downstream skill must not silently reset the budget or discard the parent evidence.

If a specialized skill or resource is unavailable, do not invent one. Return `stop` or perform one bounded discovery action.

## Deduplication and Loop Prevention

- Identify skills and resources by canonical registered identity/resource ID.
- Do not load the same skill or run the same resource twice for the same hypothesis without new evidence.
- Prefer a specialized child skill over this broad router for execution.
- Maximum one primary route and two supporting routes unless an explicit chain requires more.
- Maximum four resource references and two active tool runs per handoff.
- A child/resource failure should emit a new evidence-based signal; it must not automatically trigger every sibling technique/resource.
- Avoid loops such as:
  `AI signal → broad AI skill → LLM skill → broad AI skill`.
- Preserve parent/child/resource lineage for every handoff.

## Decision Gate

Before activating a specialized branch or external resource, answer:

1. Is the target authorized and in scope?
2. Is there concrete AI/ML evidence?
3. Which exact surface is present?
4. What signal triggered routing?
5. Which registered skill/resource is canonical for the task?
6. What evidence supports that choice?
7. What is the smallest useful test/tool run?
8. What is the expected distinguishing observation?
9. What is the remaining budget?
10. What result would cause a stop?

If these cannot be answered, stop rather than guessing.

## Safety and Quality Rules

- Preserve authorization and scope as hard gates.
- Never treat marketing language as technical evidence.
- Never fabricate model files, endpoints, outputs, provenance, or resource results.
- Do not claim RCE from a model format without an unsafe load/execution path.
- Do not claim model extraction from query volume alone.
- Do not claim privacy impact without sensitive-data evidence.
- Do not claim adversarial robustness failure is automatically a security vulnerability.
- Keep broad AI/ML routing separate from specialized execution skills.
- Prefer registered canonical skills and explicit signals over keyword matching.
- External resources may inform a hypothesis but cannot create a finding without validation.
- Stop when evidence or information gain is insufficient.
