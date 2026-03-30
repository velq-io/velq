import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listCodexSkills,
  syncCodexSkills,
} from "@velq/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("codex local skill sync", () => {
  const velqKey = "velq/velq/velq";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("reports configured Velq skills for workspace injection on the next run", async () => {
    const codexHome = await makeTempDir("velq-codex-skill-sync-");
    cleanupDirs.add(codexHome);

    const ctx = {
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        velqSkillSync: {
          desiredSkills: [velqKey],
        },
      },
    } as const;

    const before = await listCodexSkills(ctx);
    expect(before.mode).toBe("ephemeral");
    expect(before.desiredSkills).toContain(velqKey);
    expect(before.entries.find((entry) => entry.key === velqKey)?.required).toBe(true);
    expect(before.entries.find((entry) => entry.key === velqKey)?.state).toBe("configured");
    expect(before.entries.find((entry) => entry.key === velqKey)?.detail).toContain("CODEX_HOME/skills/");
  });

  it("does not persist Velq skills into CODEX_HOME during sync", async () => {
    const codexHome = await makeTempDir("velq-codex-skill-prune-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        velqSkillSync: {
          desiredSkills: [velqKey],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, [velqKey]);
    expect(after.mode).toBe("ephemeral");
    expect(after.entries.find((entry) => entry.key === velqKey)?.state).toBe("configured");
    await expect(fs.lstat(path.join(codexHome, "skills", "velq"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps required bundled Velq skills configured even when the desired set is emptied", async () => {
    const codexHome = await makeTempDir("velq-codex-skill-required-");
    cleanupDirs.add(codexHome);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        velqSkillSync: {
          desiredSkills: [],
        },
      },
    } as const;

    const after = await syncCodexSkills(configuredCtx, []);
    expect(after.desiredSkills).toContain(velqKey);
    expect(after.entries.find((entry) => entry.key === velqKey)?.state).toBe("configured");
  });

  it("normalizes legacy flat Velq skill refs before reporting configured state", async () => {
    const codexHome = await makeTempDir("velq-codex-legacy-skill-sync-");
    cleanupDirs.add(codexHome);

    const snapshot = await listCodexSkills({
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        env: {
          CODEX_HOME: codexHome,
        },
        velqSkillSync: {
          desiredSkills: ["velq"],
        },
      },
    });

    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.desiredSkills).toContain(velqKey);
    expect(snapshot.desiredSkills).not.toContain("velq");
    expect(snapshot.entries.find((entry) => entry.key === velqKey)?.state).toBe("configured");
    expect(snapshot.entries.find((entry) => entry.key === "velq")).toBeUndefined();
  });
});
