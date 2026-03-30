# CLI Reference

Velq CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm velq --help
```

First-time local bootstrap + run:

```sh
pnpm velq run
```

Choose local instance:

```sh
pnpm velq run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `velq onboard` and `velq configure --section server` set deployment mode in config
- runtime can override mode with `VELQ_DEPLOYMENT_MODE`
- `velq run` and `velq doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm velq allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.velq`:

```sh
pnpm velq run --data-dir ./tmp/velq-dev
pnpm velq issue list --data-dir ./tmp/velq-dev
```

## Context Profiles

Store local defaults in `~/.velq/context.json`:

```sh
pnpm velq context set --api-base http://localhost:3100 --company-id <company-id>
pnpm velq context show
pnpm velq context list
pnpm velq context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm velq context set --api-key-env-var-name VELQ_API_KEY
export VELQ_API_KEY=...
```

## Company Commands

```sh
pnpm velq company list
pnpm velq company get <company-id>
pnpm velq company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm velq company delete PAP --yes --confirm PAP
pnpm velq company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `VELQ_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `VELQ_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm velq issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm velq issue get <issue-id-or-identifier>
pnpm velq issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm velq issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm velq issue comment <issue-id> --body "..." [--reopen]
pnpm velq issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm velq issue release <issue-id>
```

## Agent Commands

```sh
pnpm velq agent list --company-id <company-id>
pnpm velq agent get <agent-id>
pnpm velq agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Velq agent:

- creates a new long-lived agent API key
- installs missing Velq skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `VELQ_API_URL`, `VELQ_COMPANY_ID`, `VELQ_AGENT_ID`, and `VELQ_API_KEY`

Example for shortname-based local setup:

```sh
pnpm velq agent local-cli codexcoder --company-id <company-id>
pnpm velq agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm velq approval list --company-id <company-id> [--status pending]
pnpm velq approval get <approval-id>
pnpm velq approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm velq approval approve <approval-id> [--decision-note "..."]
pnpm velq approval reject <approval-id> [--decision-note "..."]
pnpm velq approval request-revision <approval-id> [--decision-note "..."]
pnpm velq approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm velq approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm velq activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm velq dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm velq heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.velq/instances/default`:

- config: `~/.velq/instances/default/config.json`
- embedded db: `~/.velq/instances/default/db`
- logs: `~/.velq/instances/default/logs`
- storage: `~/.velq/instances/default/data/storage`
- secrets key: `~/.velq/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
VELQ_HOME=/custom/home VELQ_INSTANCE_ID=dev pnpm velq run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm velq configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
