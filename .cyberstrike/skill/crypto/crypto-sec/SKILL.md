---
name: crypto-sec
description: Signal-driven cryptography security orchestration for weak algorithms, implementation flaws, key/nonce misuse, hashes, RSA, symmetric ciphers, and Web3 cryptographic attack surfaces.
category: cryptography
verified: official
tags: [crypto, cryptography, hashes, rsa, symmetric, web3, signal-driven]
tech_stack: [cryptography, web3, blockchain]
cwe_ids: [CWE-327, CWE-328, CWE-330, CWE-347]
version: "1.0"
chains_with: [offensive-crypto-attacks, hash-attack-techniques, rsa-attack-techniques, symmetric-cipher-attacks, classical-cipher-analysis, lattice-crypto-attacks, defi-attack-patterns, smart-contract-vulnerabilities, meme-coin-audit]
files: [SKILL.md]
---

# Crypto Security Router

Canonical routing layer for the existing crypto skills. It activates from concrete cryptographic evidence, not generic words such as crypto, token, encryption, or blockchain.

## Activation Gate

Strong signals:
- observed encryption/signing/hash behavior in an application or protocol;
- concrete algorithm/mode/key/nonce/IV/ciphertext/signature parameters;
- repeated nonce/IV, deterministic ciphertext, padding oracle, timing oracle, weak randomness, or key reuse evidence;
- JWT/JWS/custom token cryptographic validation weakness;
- RSA parameters (n/e/c), signature verification behavior, or padding errors;
- hash construction or MAC behavior indicating length-extension/collision/timing risk;
- Web3 contract/token/DeFi transaction logic with a concrete cryptographic or protocol-security signal.

Weak/non-signals:
- generic use of HTTPS/TLS;
- the word crypto/encryption/token in page text;
- a modern algorithm name without misuse evidence;
- a scanner label without reproducible cryptographic behavior;
- a blockchain address or token symbol alone.

## Routing Matrix

| Signal | Specialist |
|---|---|
| Implementation misuse, padding oracle, ECB, nonce/PRNG/key-management weakness | offensive-crypto-attacks |
| Hash/MAC collision, length extension, timing, PoW | hash-attack-techniques |
| RSA parameters, small exponent, shared factor, padding oracle | rsa-attack-techniques |
| CBC/ECB/stream/PRNG/meet-in-the-middle weakness | symmetric-cipher-attacks |
| Classical substitution/Vigenere/XOR/encoding challenge | classical-cipher-analysis |
| Lattice/Coppersmith/Boneh-Durfee evidence | lattice-crypto-attacks |
| DeFi protocol attack surface | defi-attack-patterns |
| Smart-contract vulnerability | smart-contract-vulnerabilities |
| Token/meme-coin audit | meme-coin-audit |

Use one primary specialist per signal. Add a second only when new evidence creates a distinct unanswered question.

## Evidence Model

Use: signal → algorithm/scheme identified → misuse observed → controlled validation → reproduced → impact-proven → finding

Record algorithm, mode, key/nonce/IV handling, input/output references, oracle signal, test identity/scope, reproduction count, negative controls, and specialist provenance.

A weak algorithm name is not proof of vulnerability. A theoretical attack is not a finding unless the target's concrete parameters satisfy the attack conditions and the security impact is reproducible.

## Safe Validation

Prefer synthetic keys, test accounts, test contracts, and non-destructive proofs. Do not recover or expose real secrets when a harmless distinguishing proof is sufficient. For timing/oracle tests, establish a baseline and bounded sample size before drawing conclusions.

## Correlation

- Crypto weakness in authentication/token validation → auth-sec or the relevant JWT/OAuth specialist.
- Crypto issue in an API protocol → api-sec when concrete API evidence exists.
- Crypto failure causing authorization/business impact → authorization/business-logic specialist.
- Web3/DeFi issue → preserve blockchain-specific evidence and route only to the relevant existing specialist.

## Bounds and Deduplication

- Canonical key: target + cryptographic scheme + endpoint/contract + parameter/context.
- Reuse captured ciphertexts, signatures, traces, and oracle observations.
- One primary attack family before alternate techniques.
- Maximum three specialist handoffs unless new evidence changes the question.
- Stop when the cryptographic weakness is disproven or impact is reproducibly established.

## Non-Duplication

Existing crypto and Web3 specialists remain authoritative. This router provides activation, routing, evidence, correlation, and deduplication policy only.