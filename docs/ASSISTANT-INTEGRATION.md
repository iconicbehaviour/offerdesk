# Assistant integration

Offerdesk has three distinct interfaces. Do not describe them as interchangeable.

## 1. Repository setup skill

A coding-capable assistant reads the project skill, gathers onboarding inputs, installs the app, and helps configure the user's own services. This does not require a remote MCP connection. It also does not give the assistant access to accounts it could not already access. The assistant needs the user's selected repository/archive and an execution environment.

Codex-compatible instructions live at `.agents/skills/setup-offerdesk/SKILL.md`; Claude Code instructions live at `.claude/skills/setup-offerdesk/SKILL.md`. Both contain the same workflow. The surrounding assistant may require its own installation/import flow for skills. Pasting a GitHub URL is a starting request, not an automatic installation guarantee.

## 2. In-app model agents

The browser calls the private app backend, which calls the configured OpenAI or Anthropic model using the instance owner's API access. The manager delegates bounded resume and answer tasks, and a reviewer checks grounding before the owner may apply a proposal. This works independently of which assistant helped install the project.

Never reuse ChatGPT/Claude browser cookies or subscription-session tokens. Store provider keys in protected server configuration, not in onboarding data or a public bundle. The configured provider receives candidate evidence and job/request text only when a model action is requested. Review the provider's data and billing settings yourself.

## 3. Optional MCP access from a coding client

The server's `/mcp` endpoint exposes bounded tools behind the private `ADMIN_API_TOKEN` bearer credential. Compatible coding clients can configure that credential through their own protected environment/configuration. Keep the deployment HTTPS-only for remote use. No actual credential belongs in the repository, example JSON, a copied shell command, or assistant output.

Tools include redacted search preferences, saved job listings, application summaries, fetching configured public feeds and explicitly approved job addition. They do not expose keys, email OAuth tokens, arbitrary HTTP proxying, employer-form submission, or email sending. The owner must authorize external writes; an input named `approved` is a client assertion and does not replace the assistant's permission rules.

This release does not implement a native ChatGPT connector OAuth authorization server or dynamic client registration. Do not claim that its bearer-protected endpoint can automatically be added to every ChatGPT account, or that it implements “Sign in with ChatGPT.” Those are separate integrations with their own supported authentication, account and workspace requirements. Use the repository setup workflow now; add and verify a supported remote connector in a later release if needed.

## Official references

- https://developers.openai.com/plugins/build/skills
- https://developers.openai.com/plugins/concepts/skills
- https://code.claude.com/docs/en/skills
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://platform.claude.com/docs/en/api/messages/create
