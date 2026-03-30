---
title: Environment Variables
summary: Full environment variable reference
---

All environment variables that Velq uses for server configuration.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `HOST` | `127.0.0.1` | Server host binding |
| `DATABASE_URL` | (embedded) | PostgreSQL connection string |
| `VELQ_HOME` | `~/.velq` | Base directory for all Velq data |
| `VELQ_INSTANCE_ID` | `default` | Instance identifier (for multiple local instances) |
| `VELQ_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |

## Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `VELQ_SECRETS_MASTER_KEY` | (from file) | 32-byte encryption key (base64/hex/raw) |
| `VELQ_SECRETS_MASTER_KEY_FILE` | `~/.velq/.../secrets/master.key` | Path to key file |
| `VELQ_SECRETS_STRICT_MODE` | `false` | Require secret refs for sensitive env vars |

## Agent Runtime (Injected into agent processes)

These are set automatically by the server when invoking agents:

| Variable | Description |
|----------|-------------|
| `VELQ_AGENT_ID` | Agent's unique ID |
| `VELQ_COMPANY_ID` | Company ID |
| `VELQ_API_URL` | Velq API base URL |
| `VELQ_API_KEY` | Short-lived JWT for API auth |
| `VELQ_RUN_ID` | Current heartbeat run ID |
| `VELQ_TASK_ID` | Issue that triggered this wake |
| `VELQ_WAKE_REASON` | Wake trigger reason |
| `VELQ_WAKE_COMMENT_ID` | Comment that triggered this wake |
| `VELQ_APPROVAL_ID` | Resolved approval ID |
| `VELQ_APPROVAL_STATUS` | Approval decision |
| `VELQ_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

## LLM Provider Keys (for adapters)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude Local adapter) |
| `OPENAI_API_KEY` | OpenAI API key (for Codex Local adapter) |
