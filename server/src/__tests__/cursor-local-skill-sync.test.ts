import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listCursorSkills,
  syncCursorSkills,
} from "@velq/adapter-cursor-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createSkillDir(root: string, name: string) {
  const skillDir = path.join(root, name);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\n---\n`, "utf8");
  return skillDir;
}

describe("cursor local skill sync", () => {
  const velqKey = "velq/velq/velq";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("reports configured Velq skills and installs them into the Cursor skills home", async () => {
    const home = await makeTempDir("velq-cursor-skill-sync-");
    cleanupDirs.add(home);

    const ctx = {
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        velqSkillSync: {
          desiredSkills: [velqKey],
        },
      },
    } as const;

    const before = await listCursorSkills(ctx);
    expect(before.mode).toBe("persistent");
    expect(before.desiredSkills).toContain(velqKey);
    expect(before.entries.find((entry) => entry.key === velqKey)?.required).toBe(true);
    expect(before.entries.find((entry) => entry.key === velqKey)?.state).toBe("missing");

    const after = await syncCursorSkills(ctx, [velqKey]);
    expect(after.entries.find((entry) => entry.key === velqKey)?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "velq"))).isSymbolicLink()).toBe(true);
  });

  it("recognizes company-library runtime skills supplied outside the bundled Velq directory", async () => {
    const home = await makeTempDir("velq-cursor-runtime-skills-home-");
    const runtimeSkills = await makeTempDir("velq-cursor-runtime-skills-src-");
    cleanupDirs.add(home);
    cleanupDirs.add(runtimeSkills);

    const velqDir = await createSkillDir(runtimeSkills, "velq");
    const asciiHeartDir = await createSkillDir(runtimeSkills, "ascii-heart");

    const ctx = {
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        velqRuntimeSkills: [
          {
            key: "velq",
            runtimeName: "velq",
            source: velqDir,
            required: true,
            requiredReason: "Bundled Velq skills are always available for local adapters.",
          },
          {
            key: "ascii-heart",
            runtimeName: "ascii-heart",
            source: asciiHeartDir,
          },
        ],
        velqSkillSync: {
          desiredSkills: ["ascii-heart"],
        },
      },
    } as const;

    const before = await listCursorSkills(ctx);
    expect(before.warnings).toEqual([]);
    expect(before.desiredSkills).toEqual(["velq", "ascii-heart"]);
    expect(before.entries.find((entry) => entry.key === "ascii-heart")?.state).toBe("missing");

    const after = await syncCursorSkills(ctx, ["ascii-heart"]);
    expect(after.warnings).toEqual([]);
    expect(after.entries.find((entry) => entry.key === "ascii-heart")?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "ascii-heart"))).isSymbolicLink()).toBe(true);
  });

  it("keeps required bundled Velq skills installed even when the desired set is emptied", async () => {
    const home = await makeTempDir("velq-cursor-skill-prune-");
    cleanupDirs.add(home);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        velqSkillSync: {
          desiredSkills: [velqKey],
        },
      },
    } as const;

    await syncCursorSkills(configuredCtx, [velqKey]);

    const clearedCtx = {
      ...configuredCtx,
      config: {
        env: {
          HOME: home,
        },
        velqSkillSync: {
          desiredSkills: [],
        },
      },
    } as const;

    const after = await syncCursorSkills(clearedCtx, []);
    expect(after.desiredSkills).toContain(velqKey);
    expect(after.entries.find((entry) => entry.key === velqKey)?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "velq"))).isSymbolicLink()).toBe(true);
  });
});
