---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm velq issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm velq issue get <issue-id-or-identifier>

# Create issue
pnpm velq issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm velq issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm velq issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm velq issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm velq issue release <issue-id>
```

## Company Commands

```sh
pnpm velq company list
pnpm velq company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm velq company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm velq company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
pnpm velq company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm velq agent list
pnpm velq agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm velq approval list [--status pending]

# Get approval
pnpm velq approval get <approval-id>

# Create approval
pnpm velq approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm velq approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm velq approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm velq approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm velq approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm velq approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm velq activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm velq dashboard get
```

## Heartbeat

```sh
pnpm velq heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
