/**
 * MockAgent — simulates an AI agent without real LLM API calls.
 *
 * Inserts heartbeat runs and wakeup requests directly into the database to
 * mimic the lifecycle of a real agent:
 *   1. startRun()  — agent claims a wakeup request and begins a run
 *   2. finishRun() — agent completes the run (updates status + exitCode)
 *   3. toActor()   — returns the actor shape expected by Express req.actor
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { agentWakeupRequests, heartbeatRuns, type Db } from "@velq/db";

export interface MockAgentConfig {
  db: Db;
  agentId: string;
  companyId: string;
}

export class MockAgent {
  readonly agentId: string;
  readonly companyId: string;
  private readonly db: Db;

  /** The ID of the currently active heartbeat run, or null when idle. */
  runId: string | null = null;

  constructor({ db, agentId, companyId }: MockAgentConfig) {
    this.agentId = agentId;
    this.companyId = companyId;
    this.db = db;
  }

  /**
   * Simulates the agent receiving a wakeup request and starting a run.
   * Returns the new runId and wakeupRequestId inserted into the database.
   */
  async startRun(payload: Record<string, unknown> = {}): Promise<{ runId: string; wakeupRequestId: string }> {
    const wakeupRequestId = randomUUID();
    const runId = randomUUID();
    const now = new Date();

    await this.db.insert(agentWakeupRequests).values({
      id: wakeupRequestId,
      companyId: this.companyId,
      agentId: this.agentId,
      source: "assignment",
      triggerDetail: "system",
      reason: "issue_assigned",
      payload,
      status: "claimed",
      runId,
      claimedAt: now,
    });

    await this.db.insert(heartbeatRuns).values({
      id: runId,
      companyId: this.companyId,
      agentId: this.agentId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "running",
      wakeupRequestId,
      contextSnapshot: payload,
      startedAt: now,
    });

    this.runId = runId;
    return { runId, wakeupRequestId };
  }

  /**
   * Simulates the agent completing its run successfully.
   * Marks the heartbeat run as "done" and clears the active runId.
   */
  async finishRun(exitCode = 0): Promise<void> {
    if (!this.runId) throw new Error("No active run — call startRun() first");
    await this.db
      .update(heartbeatRuns)
      .set({ status: "done", exitCode, finishedAt: new Date() })
      .where(eq(heartbeatRuns.id, this.runId));
    this.runId = null;
  }

  /**
   * Returns the actor object expected by Express req.actor for agent routes.
   * Must call startRun() first so that runId is non-null for checkout/patch.
   */
  toActor(): { type: "agent"; agentId: string; companyId: string; runId: string | null } {
    return {
      type: "agent" as const,
      agentId: this.agentId,
      companyId: this.companyId,
      runId: this.runId,
    };
  }
}
