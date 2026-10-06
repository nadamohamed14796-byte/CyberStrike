---
name: clickjacking
description: >-
  Clickjacking playbook. Use when testing whether target pages can be framed, whether X-Frame-Options or CSP frame-ancestors are properly configured, and whether UI redress attacks can trigger sensitive actions.
---

# SKILL: Clickjacking — Expert Attack Playbook

> **AI LOAD INSTRUCTION**: Clickjacking (UI redress) techniques. Covers iframe transparency tricks, X-Frame-Options bypass, CSP frame-ancestors, multi-step clickjacking, drag-and-drop attacks, and chaining with other vulnerabilities. Often a "low severity" finding that becomes critical when targeting admin actions.

## 1. CORE CONCEPT

Clickjacking loads a target page in a transparent iframe overlaid on an attacker's page. The victim sees the attacker's UI but clicks on the invisible target page, performing unintended actions.

```html
<style>
  iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.0001; z-index: 2; }
  .decoy { position: absolute; top: 200px; left: 100px; z-index: 1; }
</style>
<div class="decoy"><button>Click to win a prize!</button></div>
<iframe src="https://target.com/account/delete?confirm=yes"></iframe>
```

---

## 2. DETECTION — IS THE PAGE FRAMEABLE?

### Check X-Frame-Options Header

```
X-Frame-Options: DENY           → cannot be framed (secure)
X-Frame-Options: SAMEORIGIN     → only same-origin framing (secure for cross-origin)
X-Frame-Options: ALLOW-FROM uri → deprecated, browser support inconsistent
(header absent)                  → frameable! (vulnerable)
```

### Check CSP frame-ancestors

```
Content-Security-Policy: frame-ancestors 'none'        → cannot be framed
Content-Security-Policy: frame-ancestors 'self'         → same-origin only
Content-Security-Policy: frame-ancestors https://a.com  → specific origin
(directive absent)                                       → frameable
```

**CSP frame-ancestors supersedes X-Frame-Options** in modern browsers.

### Quick PoC Test

```html
<iframe src="https://target.com/sensitive-action" width="800" height="600"></iframe>
```

If the page loads in the iframe → frameable → potentially vulnerable.

### JavaScript Frame Detection (from target page source)

```javascript
// Common frame-busting code found in target pages:
if (top.location.hostname !== self.location.hostname) {
    top.location.href = self.location.href;
}
```

If this code is present but not using CSP `frame-ancestors`, it can often be bypassed.

---

## 3. PROOF OF CONCEPT TEMPLATES

### Basic Single-Click

```html
<html>
<head><title>Free Prize</title></head>
<body>
<h1>Click the button to claim your prize!</h1>
<style>
  iframe { position: absolute; top: 300px; left: 60px;
           width: 500px; height: 200px; opacity: 0.0001; z-index: 2; }
</style>
<iframe src="https://target.com/account/settings?action=delete"></iframe>
</body>
</html>
```

### Multi-Step Clickjacking

For actions requiring multiple clicks (e.g., "Are you sure?" confirmation):

```html
<div id="step1">
  <button onclick="document.getElementById('step1').style.display='none';
                    document.getElementById('step2').style.display='block';">
    Step 1: Click here
  </button>
</div>
<div id="step2" style="display:none">
  <button>Step 2: Confirm</button>
</div>
<iframe src="https://target.com/admin/action"></iframe>
```

Reposition iframe for each step to align the transparent button with the decoy.

### Drag-and-Drop Clickjacking

Extract data from one iframe to another using HTML5 drag-and-drop events — the victim drags across invisible iframes, transferring tokens or data.

---

## 4. BYPASS TECHNIQUES

### Frame-Busting Script Bypass

Some pages use JavaScript frame-busting:
```javascript
if (top !== self) { top.location = self.location; }
```

**Bypass with sandbox attribute**:
```html
<iframe src="https://target.com" sandbox="allow-forms allow-scripts"></iframe>
<!-- sandbox without allow-top-navigation prevents frame-busting -->
```

### X-Frame-Options ALLOW-FROM Bypass

`ALLOW-FROM` is not supported in Chrome/Safari. If the server relies solely on `ALLOW-FROM`, modern browsers ignore it → page is frameable.

### Double-Framing

If `X-Frame-Options: SAMEORIGIN` is set, but a same-origin page exists that can be framed (without XFO), use that page as an intermediary to frame the target.

---

## 5. HIGH-IMPACT TARGETS

```text
Account deletion page
Email/password change form
Admin panel actions (add user, change role)
Payment confirmation
OAuth authorization ("Allow" button)
Two-factor authentication disable
API key generation
Webhook configuration
```

---

## 6. TESTING CHECKLIST

```
□ Check X-Frame-Options header on sensitive pages
□ Check CSP frame-ancestors directive
□ Create iframe PoC and verify page loads
□ Test frame-busting scripts — try sandbox attribute bypass
□ Identify high-value single-click actions
□ For multi-step actions, build multi-click PoC
□ Test both authenticated and unauthenticated pages
□ Verify ALLOW-FROM behavior across browsers
```

---

Source: https://github.com/yaklang/hack-skills
License: MIT (Copyright (c) 2026 VillanCh)
Adapted for CyberStrike skill runtime. Imported as SKILL.md only; supplementary upstream files are not included.

---

## 6. Signal-Driven Activation

This skill is a specialist, not a generic web-security checklist. Activate it only when a concrete framing signal exists.

### Strong signals
- An observed HTML response lacks an effective framing restriction and the page contains an in-scope interactive action.
- X-Frame-Options is missing, ineffective, malformed, or uses deprecated ALLOW-FROM.
- A CSP response has a concrete frame-ancestors directive that permits the observed attacker/test origin or is absent where framing matters.
- Browser evidence shows the target document actually renders in a cross-origin frame.
- A frame-busting mechanism is observed and requires browser validation.
- A sensitive authenticated UI action is reachable from a frameable page.

### Weak/non-signals
Do not activate solely because:
- the word clickjacking appears in text;
- X-Frame-Options is absent on a static/public page;
- CSP exists without frame-ancestors;
- a page is technically iframe-capable but has no meaningful user action;
- a scanner labels a response vulnerable without browser or impact evidence.

---

## 7. Effective Framing Policy

Always evaluate the response as a policy, not as isolated headers.

Record:
- target URL and final URL after redirects;
- response status and content type;
- every X-Frame-Options value;
- every CSP header and frame-ancestors directive;
- relevant ancestor origins;
- redirect-chain policy differences;
- browser result.

Use effective browser behavior as the final authority. Do not claim that a header is exploitable merely because it looks weak.

### Policy states
Classify the result as one of: blocked, same-origin-only, explicitly-allowed-origin, cross-origin-frameable, browser-blocked, or unknown.

A missing header is only a candidate state.

---

## 8. Browser Validation

Use the existing browser/hackbrowser capability for actual frame validation instead of creating a second crawler.

For each candidate:
1. Preserve the original target URL and response evidence.
2. Test a controlled cross-origin frame using a benign test page.
3. Observe whether the document reaches a usable rendered state.
4. Record browser console/navigation/frame errors.
5. Check whether client-side frame-busting changes the result.
6. If authenticated, repeat only with an authorized test account.
7. Do not perform destructive or irreversible actions merely to prove framing.

Never use sandboxing or navigation tricks as a reason to call a finding valid. The question is whether the real application security boundary fails in a normal attacker-controlled cross-origin frame.

---

## 9. Impact Gate

A confirmed clickjacking finding requires all applicable evidence:
- target is actually frameable in the tested browser/context;
- the frame remains usable for the relevant interaction;
- a meaningful user action is reachable;
- the action crosses a security or business boundary;
- authentication/cookie behavior permits the action when required;
- the result is reproducible;
- the action is authorized and safely demonstrated.

Prioritize, without automatically inflating severity:
- account/security setting changes;
- role or administrative actions;
- payment/transaction confirmation;
- OAuth consent;
- API-key or webhook changes;
- account deletion;
- MFA/security-control changes.

A frameable login page or harmless UI is not sufficient.

---

## 10. Authentication, Cookie, and CSRF Correlation

Before declaring impact, correlate:
- authentication state;
- SameSite cookie behavior;
- CSRF token requirements;
- origin/referrer checks;
- frame-busting JavaScript;
- state-changing request and response;
- identity/tenant context.

Route to auth-sec when authentication/session behavior is the unanswered question.
Route to the canonical CSRF skill when cross-site request semantics are the unanswered question.
Route to business-logic-vuln when the frameable action demonstrates a business-state invariant violation or sensitive workflow impact.
Do not duplicate those specialists' tests inside this skill.

---

## 11. Evidence Contract

Use: signal → candidate → policy-observed → browser-validated → impact-proven → finding

Persist enough evidence to reproduce the result:
- URL/final URL;
- request/response reference;
- relevant headers;
- CSP directive;
- browser/frame result;
- authentication state;
- action label and endpoint if applicable;
- state before/after;
- related specialist handoffs;
- negative results and blocked conditions.

Header absence, status code, or scanner output alone must never reach finding.

---

## 12. Bounded Execution and Deduplication

- Reuse captured HTTP/browser artifacts.
- Test one canonical URL per equivalent policy/endpoint before expanding.
- Do not repeat the same framing test after an unchanged policy result.
- Limit alternate-browser validation to cases where browser-specific behavior is material.
- Keep one evidence lineage for each URL + identity + framing origin.
- Preserve partial evidence if browser execution fails.
- Stop when the framing policy and impact question are answered or no new evidence can be obtained within scope.

---

## 13. Handoff Contract

Every handoff must include:
- target and scope;
- canonical URL;
- final URL after redirects;
- framing-origin used for validation;
- effective framing policy;
- authentication/identity state;
- action/control tested;
- request/response references;
- browser result;
- exact unanswered security question;
- expected evidence needed to advance the state.

This keeps clickjacking as a focused specialist rather than a duplicate auth/CSRF/business-logic engine.

---

## 14. Coverage

This skill covers:
- X-Frame-Options analysis;
- CSP frame-ancestors;
- effective-policy/redirect analysis;
- real browser frame validation;
- frame-busting observation;
- authenticated framing context;
- sensitive-action impact validation;
- correlation with auth/session, CSRF, and business logic.

It does not replace the existing WSTG clickjacking skill, CSRF skill, auth/session skills, or business-logic specialists; those remain authoritative for their own domains.