import { hookManager } from "../HookManager"
import { IntentService } from "../intent/IntentService"
import { TraceService } from "../trace/TraceService"
import * as fs from "fs/promises"
import * as path from "path"

const workspacePath = process.cwd()

describe("Integration: full intent flow", () => {
	beforeAll(async () => {
		const intentService = IntentService.getInstance(workspacePath)
		await intentService.initialize()
		// ensure an intent exists
		await intentService.updateIntent({
			id: "INT-TEST",
			name: "Test",
			summary: "",
			description: "",
			status: "in_progress",
			priority: "normal",
			owned_scope: ["src/hooks/**"],
			constraints: [],
			acceptance_criteria: [],
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			related_intents: [],
		} as any)
	})

	it("should write a trace entry when executing write_file with intent", async () => {
		const traceService = TraceService.getInstance(workspacePath)
		// remove previous trace file if exists
		const tracePath = path.join(workspacePath, ".orchestration", "agent_trace.jsonl")
		try {
			await fs.unlink(tracePath)
		} catch {}

		await hookManager.executeToolWithHooks(
			"write_file",
			{ intent_id: "INT-TEST", file_path: "src/hooks/dummy.ts", content: "hello" },
			async () => ({ success: true }),
		)

		const content = await fs.readFile(tracePath, "utf-8")
		expect(content).toContain("INT-TEST")
		expect(content).toContain("dummy.ts")
	})
})
