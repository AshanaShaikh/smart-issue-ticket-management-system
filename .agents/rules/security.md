# Security & Credentials Policy

- **Never read, display, copy, or reuse secret values** from `.env` files, environment variables, or other credential stores when generating commands, logs, prompts, or code.
- **Treat all credentials as strictly sensitive:**
  - Database passwords, API keys, tokens, JWT secrets, etc., must never be echoed or embedded into terminal commands, scripts, or commit messages.
- **Use placeholders for secrets:**
  - Use placeholders such as `<DB_PASSWORD>` or `<YOUR_SECRET_KEY>` and instruct the user to provide them interactively or via secure environment variables.
- **Explicit approval required:**
  - Never execute commands involving secrets or database credential arguments without explicit user approval.
- **Inspect configuration safely:**
  - When troubleshooting environment configuration, inspect only the key names or structure (e.g., verifying if a variable is set or present) without reading or exposing the actual secret values.
