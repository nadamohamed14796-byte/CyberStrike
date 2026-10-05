# XSS in AI and Agentic Web Applications

Use for authorized testing of AI assistants, agent UIs, document renderers, markdown viewers, URL summarizers, and AI-integrated frontends.

## Coverage
- Prompt/content injection that crosses into HTML or markdown rendering.
- AI-generated HTML/markdown rendered without adequate sanitization.
- URL/document ingestion followed by unsafe client rendering.
- Tool results or model output reaching DOM sinks.
- Rich previews, citations, attachments, and generated UI components.
- Polymorphic/context-aware test generation for defensive validation.

## Workflow
1. Map untrusted input → model/agent → tool/result → renderer → browser sink.
2. Separate prompt injection from the downstream XSS condition.
3. Determine whether model output is treated as trusted HTML, markdown, URL, SVG, or plain text.
4. Test renderer transformations and sanitization boundaries.
5. Check whether model-generated content can influence privileged UI or an administrator-facing view.
6. Use harmless execution markers and prove the final browser context.
7. Evaluate impact such as privileged UI actions or sensitive DOM access without collecting real secrets.

## Important distinction
Prompt injection by itself is not XSS. An AI response containing HTML is not XSS unless the application renders it in an executable context. Identify the exact renderer and sink.

## Validation gate
Require a reproducible chain from attacker-controlled input to browser execution, with clear victim/prerequisite and impact evidence. Do not rely on hypothetical model behavior.