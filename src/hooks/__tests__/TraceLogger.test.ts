import { logExecution } from "../post/TraceLogger"
import { TraceService } from "../trace/TraceService"
import * as fs from "fs/promises"
import * as path from "path"

describe("TraceLogger", () => {
	let workspace: string

	beforeEach(async () => {
		workspace = await fs.mkdtemp(path.join(process.cwd(), "tmp-workspace-"))
		// ensure orchestration folder
		await fs.mkdir(path.join(workspace, ".orchestration"))
		// add a dummy intent
		const intents = `active_intents:\n  - id: INT-123\n    title: test\n    status: open\n`
		await fs.writeFile(path.join(workspace, ".orchestration", "active_intents.yaml"), intents, "utf-8")

		// reinitialize singletons
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		TraceService.instance = null
		TraceService.getInstance(workspace)
	})

	afterEach(async () => {
		await fs.rm(workspace, { recursive: true, force: true })
	})

	it("should append a trace entry for write_file with existing file (AST_REFACTOR)", async () => {
		const filePath = path.join(workspace, "foo.txt")
		await fs.writeFile(filePath, "hello", "utf-8")

		const context: any = {
			intent_id: "INT-123",
			tool_name: "write_file",
			tool_args: { path: filePath, content: "updated" },
		}

		await logExecution(context, {})

		const traceText = await fs.readFile(path.join(workspace, ".orchestration", "agent_trace.jsonl"), "utf-8")
		const entries = traceText
			.trim()
			.split("\n")
			.map((l) => JSON.parse(l))
		expect(entries.length).toBeGreaterThan(0)
		const entry = entries[entries.length - 1]
		expect(entry.intent_id).toBe("INT-123")
		expect(entry.mutation_class).toBe("AST_REFACTOR")
		expect(entry.files[0].relative_path).toBe(filePath)
		expect(entry.files[0].conversations[0].ranges[0].content_hash).toBeDefined()
	})

	it("should classify create_file as INTENT_EVOLUTION", async () => {
		const filePath = path.join(workspace, "new.txt")
		const context: any = {
			intent_id: "INT-123",
			tool_name: "create_file",
			tool_args: { path: filePath, content: "abc" },
		}
		await logExecution(context, {})
		const traceText = await fs.readFile(path.join(workspace, ".orchestration", "agent_trace.jsonl"), "utf-8")
		const entry = JSON.parse(traceText.trim().split("\n").pop()!)
		expect(entry.mutation_class).toBe("INTENT_EVOLUTION")
	})
})
