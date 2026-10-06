---
name: command-injection-sec
description: Signal-driven command/JNDI injection routing for shell, process-execution, Java JNDI, and blind/OOB execution surfaces.
category: injection
tags: [command-injection, cmdi, jndi, rce, injection, signal-driven]
tech_stack: [web, http, linux, windows, java]
cwe_ids: [CWE-78, CWE-917]
version: "1.0"
chains_with: [cmdi-command-injection, jndi-injection, wstg-inpv-12, hunt-rce, deserialization-insecure, expression-language-injection]
---

# Command Injection Security Router

`command-injection-sec` is a focused routing layer. It does not replace the existing command-injection or JNDI skills and must not load the entire injection family from a generic keyword.

## Activation Gate

Require concrete execution-sink evidence:
- user-controlled value reaches a shell/process execution API or OS command wrapper;
- endpoint/function performs ping, DNS lookup, traceroute, conversion, archive, backup, import, export, log processing, search, sort, or script execution with user-controlled input;
- observable shell metacharacter handling or command-substitution behavior;
- blind timing/OOB behavior consistent with server-side command execution;
- Java application performs JNDI lookup using attacker-controlled data;
- Log4j/lookup syntax reaches a logging or expression-processing sink;
- source/code evidence shows `exec`, `system`, `popen`, `spawn`, `Runtime.exec`, `ProcessBuilder`, `InitialContext.lookup`, or an equivalent sink receiving untrusted data.

Do not activate solely because:
- the word `command` or `shell` appears in page text;
- a server is Linux/Windows;
- Java is detected without a JNDI sink;
- a scanner reports RCE without sink and execution evidence;
- a parameter has an unusual name such as `cmd`, `exec`, or `command`.

## Routing Matrix

| Concrete signal | Specialist |
|---|---|
| OS shell/process execution sink | `cmdi-command-injection` |
| Java JNDI lookup or Log4j-style JNDI evaluation | `jndi-injection` |
| WSTG command-injection coverage/reference | `wstg-inpv-12` |
| Reproducible command execution with security impact | `hunt-rce` for RCE correlation/validation |
| JNDI path that depends on deserialization/gadget behavior | `deserialization-insecure` |
| JNDI reached through expression evaluation | `expression-language-injection` |

Do not run multiple specialists for the same unanswered question. For example, a confirmed Java JNDI sink should route to `jndi-injection`, not also launch generic CMDi testing.

## Sink Classification

Normalize the sink before testing:
- shell command string;
- direct executable + argument array;
- OS process wrapper;
- interpreter/runtime execution;
- converter or helper process;
- scheduled/background worker;
- Java JNDI lookup;
- logging lookup/expression path.

Record the source parameter, transformation path, sink, execution context, operating system/runtime when known, authentication state, and evidence source.

## Safe Validation

Use the least-impact proof that answers the security question:
- prefer benign command identity/version checks where output is safely observable;
- use timing only when output is unavailable and establish a clean baseline;
- use authorized OOB interaction only when it materially distinguishes execution from application behavior;
- never treat a response delay, error, reflection, or WAF reaction alone as command execution;
- avoid destructive commands, persistence, credential theft, or broad filesystem/network collection.

## Evidence Lifecycle

Use:
`signal → sink-observed → controlled-execution → reproduced → impact-proven → finding`

Evidence should include:
- canonical endpoint/function;
- source parameter and exact transformation;
- sink/runtime context;
- baseline and variant request/response references;
- output, timing, or OOB evidence;
- identity/scope context;
- reproduction count;
- negative controls;
- specialist handoffs.

Source-code sink discovery is strong evidence of a candidate, not proof that attacker-controlled input reaches execution.

## Adaptive Testing

When a concrete filter/transformation prevents a controlled test, hand off only after recording the baseline and transformation evidence. Use the existing adaptive-testing chain for failure analysis, transformation analysis, technique matching, and bounded mutation. Do not create a second payload-mutation engine here.

## Correlation

- File upload/import/conversion workflow → existing upload/file-processing specialist.
- API-backed execution endpoint → `api-sec` when concrete API evidence exists.
- Authentication/authorization question around the execution feature → `auth-sec`.
- Business workflow impact → `business-logic-vuln`.
- WAF transformation signal → existing `waf-evasion`/`waf-bypass` chain only when concrete filtering evidence exists.

## Bounds and Deduplication

- Maintain one canonical sink record per target + endpoint + parameter + sink.
- Reuse captured requests and runtime evidence.
- One primary validation path before alternate techniques.
- Maximum three specialist handoffs from one signal unless new evidence changes the question.
- Stop after reproducible execution evidence or when the sink cannot be safely validated within scope.

## Handoff Contract

Pass:
- target and scope;
- canonical endpoint/function;
- parameter/source;
- sink type;
- runtime/OS evidence;
- exact signal;
- baseline/variant references;
- evidence state;
- prior actions;
- unanswered question;
- expected proof;
- safety constraints.

## Non-Duplication

Existing `cmdi-command-injection`, `jndi-injection`, WSTG, RCE, deserialization, and expression-language skills remain authoritative. This router adds signal selection and evidence gates; it does not replace or delete their content.