---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `velq run`

One-command bootstrap and start:

```sh
pnpm velq run
```

Does:

1. Auto-onboards if config is missing
2. Runs `velq doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm velq run --instance dev
```

## `velq onboard`

Interactive first-time setup:

```sh
pnpm velq onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm velq onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm velq onboard --yes
```

## `velq doctor`

Health checks with optional auto-repair:

```sh
pnpm velq doctor
pnpm velq doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `velq configure`

Update configuration sections:

```sh
pnpm velq configure --section server
pnpm velq configure --section secrets
pnpm velq configure --section storage
```

## `velq env`

Show resolved environment configuration:

```sh
pnpm velq env
```

## `velq allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm velq allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.velq/instances/default/config.json` |
| Database | `~/.velq/instances/default/db` |
| Logs | `~/.velq/instances/default/logs` |
| Storage | `~/.velq/instances/default/data/storage` |
| Secrets key | `~/.velq/instances/default/secrets/master.key` |

Override with:

```sh
VELQ_HOME=/custom/home VELQ_INSTANCE_ID=dev pnpm velq run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm velq run --data-dir ./tmp/velq-dev
pnpm velq doctor --data-dir ./tmp/velq-dev
```
