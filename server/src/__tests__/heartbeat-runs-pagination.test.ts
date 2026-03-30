/**
 * Heartbeat-runs pagination and stats endpoint tests.
 *
 * Runs against a real embedded PostgreSQL instance (skipped on unsupported hosts).
 */

import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agentWakeupRequests,
  agents,
  companies,
  createDb,
  heartbeatRunEvents,
  heartbeatRuns,
} from "@velq/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { errorHandler } from "../middleware/index.js";

vi.mock("../services/index.js", async () => {
  const actual = await vi.importActual<typeof import("../services/index.js")>("../services/index.js");
  return {
    ...actual,
    heartbeatService: (...args: Parameters<typeof actual.heartbeatService>) => {
      const real = actual.heartbeatService(...args);
      return { ...real, wakeup: async () => null };
    },
  };
});

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping heartbeat-runs pagination tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("heartbeat-runs pagination & stats", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("velq-pagination-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(heartbeatRunEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async function seedCompanyAndAgent() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const issuePrefix = `PA${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    await db.insert(companies).values({
      id: companyId,
      name: "Pagination Test Co",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });

    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "PaginationAgent",
      role: "engineer",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    return { companyId, agentId };
  }

  async function seedRuns(companyId: string, agentId: string, count: number, statusOverride?: string) {
    const runIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      runIds.push(id);
      await db.insert(heartbeatRuns).values({
        id,
        companyId,
        agentId,
        invocationSource: "on_demand",
        triggerDetail: "test",
        status: statusOverride ?? (i % 3 === 0 ? "error" : "done"),
        startedAt: new Date(Date.now() - i * 60_000),
        finishedAt: new Date(Date.now() - i * 60_000 + 5_000),
        contextSnapshot: {},
      });
    }
    return runIds;
  }

  async function createAgentApp(companyId: string) {
    const { agentRoutes } = await import("../routes/agents.js");
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).actor = {
        type: "board",
        source: "local_implicit",
        isInstanceAdmin: true,
        companyIds: [companyId],
      };
      next();
    });
    app.use("/api", agentRoutes(db));
    app.use(errorHandler);
    return app;
  }

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  it("returns paginated runs with total count", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();
    await seedRuns(companyId, agentId, 15);

    const app = await createAgentApp(companyId);

    // First page
    const page1 = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs?limit=5&offset=0`);

    expect(page1.status).toBe(200);
    expect(page1.body).toHaveProperty("runs");
    expect(page1.body).toHaveProperty("total");
    expect(page1.body.runs).toHaveLength(5);
    expect(page1.body.total).toBe(15);

    // Second page
    const page2 = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs?limit=5&offset=5`);

    expect(page2.status).toBe(200);
    expect(page2.body.runs).toHaveLength(5);
    expect(page2.body.total).toBe(15);

    // No overlap between pages
    const ids1 = new Set(page1.body.runs.map((r: { id: string }) => r.id));
    for (const run of page2.body.runs) {
      expect(ids1.has(run.id)).toBe(false);
    }
  });

  it("filters by agentId and paginates correctly", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();

    // Second agent
    const agentId2 = randomUUID();
    await db.insert(agents).values({
      id: agentId2,
      companyId,
      name: "OtherAgent",
      role: "engineer",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    await seedRuns(companyId, agentId, 8);
    await seedRuns(companyId, agentId2, 4);

    const app = await createAgentApp(companyId);

    const res = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs?agentId=${agentId}&limit=10&offset=0`);

    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(8);
    expect(res.body.total).toBe(8);
    for (const run of res.body.runs) {
      expect(run.agentId).toBe(agentId);
    }
  });

  it("defaults to limit=50 when not specified", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();
    await seedRuns(companyId, agentId, 10);

    const app = await createAgentApp(companyId);
    const res = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs`);

    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(10);
    expect(res.body.total).toBe(10);
  });

  it("returns stats with total, byStatus, and recentFailures", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();
    // 6 done + 4 error
    await seedRuns(companyId, agentId, 6, "done");
    await seedRuns(companyId, agentId, 4, "error");

    const app = await createAgentApp(companyId);
    const res = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs/stats`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10);
    expect(res.body.byStatus.done).toBe(6);
    expect(res.body.byStatus.error).toBe(4);
    expect(Array.isArray(res.body.recentFailures)).toBe(true);
    expect(res.body.recentFailures.length).toBe(4);
    for (const run of res.body.recentFailures) {
      expect(run.status).toBe("error");
    }
  });

  it("stats returns empty result when no runs exist", async () => {
    const { companyId } = await seedCompanyAndAgent();

    const app = await createAgentApp(companyId);
    const res = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs/stats`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.byStatus).toEqual({});
    expect(res.body.recentFailures).toHaveLength(0);
  });

  it("offset beyond total returns empty runs array with correct total", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();
    await seedRuns(companyId, agentId, 3);

    const app = await createAgentApp(companyId);
    const res = await request(app)
      .get(`/api/companies/${companyId}/heartbeat-runs?limit=10&offset=100`);

    expect(res.status).toBe(200);
    expect(res.body.runs).toHaveLength(0);
    expect(res.body.total).toBe(3);
  });
});
