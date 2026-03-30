# Plugin Authoring Smoke Example

A Velq plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

## Install Into Velq

```bash
pnpm velq plugin install ./
```

## Build Options

- `pnpm build` uses esbuild presets from `@velq/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
