/**
 * E2E: company creation → agent registration → task assignment → completion
 *
 * Runs against a real embedded PostgreSQL instance (skipped on unsupported hosts).
 * Uses MockAgent to simulate heartbeat / checkout / task-completion without any
 * real LLM API calls.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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
  issues,
} from "@velq/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { errorHandler } from "../middleware/index.js";
import type { StorageService } from "../storage/types.js";
import { MockAgent } from "@velq/mock-agent";

// ---------------------------------------------------------------------------
// Mock the heartbeat service so wakeup calls are no-ops.
// Issue routes call heartbeat.wakeup() with void (fire-and-forget), but a
// no-op mock keeps the DB state predictable and avoids external side effects.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Embedded Postgres guard
// ---------------------------------------------------------------------------
const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres E2E workflow tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

// ---------------------------------------------------------------------------
// Minimal storage stub — not needed by the routes exercised in this test
// ---------------------------------------------------------------------------
const stubStorage: StorageService = {
  provider: "local_disk",
  putFile: async () => { throw new Error("putFile not implemented in stub"); },
  getObject: async () => { throw new Error("getObject not implemented in stub"); },
  headObject: async () => { throw new Error("headObject not implemented in stub"); },
  deleteObject: async () => { throw new Error("deleteObject not implemented in stub"); },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describeEmbeddedPostgres("agent workflow end-to-end", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("velq-e2e-workflow-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    // FK-safe deletion order
    await db.delete(activityLog);
    await db.delete(heartbeatRunEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(issues);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function boardActor() {
    return {
      type: "board",
      source: "local_implicit",
      isInstanceAdmin: true,
      companyIds: [] as string[],
    };
  }

  async function createIssueApp() {
    const { issueRoutes } = await import("../routes/issues.js");
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).actor = boardActor();
      next();
    });
    app.use("/api", issueRoutes(db, stubStorage));
    app.use(errorHandler);
    return app;
  }

  async function createIssueAppWithActor(actor: Record<string, unknown>) {
    const { issueRoutes } = await import("../routes/issues.js");
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).actor = actor;
      next();
    });
    app.use("/api", issueRoutes(db, stubStorage));
    app.use(errorHandler);
    return app;
  }

  async function seedCompanyAndAgent() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    // issuePrefix must be unique; derive from companyId
    const issuePrefix = `VE${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    await db.insert(companies).values({
      id: companyId,
      name: "Velq Test Co",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });

    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "MockCoder",
      role: "engineer",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    return { companyId, agentId, issuePrefix };
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  it("company creation → agent registration → task assignment → completion", async () => {
    // 1. Seed: company + agent in DB
    const { companyId, agentId } = await seedCompanyAndAgent();

    // 2. Create issue via board actor (status: "todo", no assignee → wakeup skipped)
    const boardApp = await createIssueApp();
    const createRes = await request(boardApp)
      .post(`/api/companies/${companyId}/issues`)
      .send({ title: "Implement new feature", status: "todo", priority: "medium" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("todo");
    const issueId = createRes.body.id as string;
    expect(issueId).toBeTruthy();

    // 3. MockAgent starts a run (simulates receiving wakeup + heartbeat start)
    const mockAgent = new MockAgent({ db, agentId, companyId });
    const { runId } = await mockAgent.startRun({ issueId });
    expect(runId).toBeTruthy();

    // 4. Agent checks out the issue (claims it as "in_progress")
    const agentActorForCheckout = mockAgent.toActor();
    const agentApp = await createIssueAppWithActor(agentActorForCheckout);

    const checkoutRes = await request(agentApp)
      .post(`/api/issues/${issueId}/checkout`)
      .send({ agentId, expectedStatuses: ["todo"] });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.status).toBe("in_progress");
    expect(checkoutRes.body.checkoutRunId).toBe(runId);
    expect(checkoutRes.body.assigneeAgentId).toBe(agentId);

    // 5. Agent marks the issue as done
    const doneRes = await request(agentApp)
      .patch(`/api/issues/${issueId}`)
      .send({ status: "done" });

    expect(doneRes.status).toBe(200);
    expect(doneRes.body.status).toBe("done");

    // 6. Verify final state in DB
    const finalIssue = await db
      .select()
      .from(issues)
      .where(eq(issues.id, issueId))
      .then((rows) => rows[0] ?? null);

    expect(finalIssue?.status).toBe("done");
    expect(finalIssue?.assigneeAgentId).toBe(agentId);
    expect(finalIssue?.checkoutRunId).toBe(runId);

    // 7. Verify heartbeat run is still "running" (agent hasn't called finishRun yet)
    const runRow = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0] ?? null);

    expect(runRow?.status).toBe("running");

    // 8. Agent finishes its run
    await mockAgent.finishRun(0);
    const finishedRun = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0] ?? null);

    expect(finishedRun?.status).toBe("done");
    expect(finishedRun?.exitCode).toBe(0);
  });

  it("checkout requires a matching runId to update the issue", async () => {
    const { companyId, agentId } = await seedCompanyAndAgent();

    // Create and check out an issue with agent A's run
    const boardApp = await createIssueApp();
    const createRes = await request(boardApp)
      .post(`/api/companies/${companyId}/issues`)
      .send({ title: "Conflict test", status: "todo" });
    expect(createRes.status).toBe(201);
    const issueId = createRes.body.id as string;

    const mockAgent = new MockAgent({ db, agentId, companyId });
    await mockAgent.startRun({ issueId });
    const agentApp = await createIssueAppWithActor(mockAgent.toActor());

    const checkoutRes = await request(agentApp)
      .post(`/api/issues/${issueId}/checkout`)
      .send({ agentId, expectedStatuses: ["todo"] });
    expect(checkoutRes.status).toBe(200);

    // A second agent tries to patch with a different runId — should get 409
    const wrongRunId = randomUUID();
    const wrongActorApp = await createIssueAppWithActor({
      type: "agent",
      agentId,
      companyId,
      runId: wrongRunId,
    });

    const patchRes = await request(wrongActorApp)
      .patch(`/api/issues/${issueId}`)
      .send({ status: "done" });

    expect(patchRes.status).toBe(409);
  });
});
