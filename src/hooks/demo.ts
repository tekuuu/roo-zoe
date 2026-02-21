import { hookManager } from "./HookManager"
import { IntentService } from "./intent/IntentService"
import { TraceService } from "./trace/TraceService"

async function runDemo() {
	const workspacePath = process.cwd()
	const intentService = IntentService.getInstance(workspacePath)
	await intentService.initialize()

	// create sample intent
	await intentService.updateIntent({
		id: "INT-DEM1",
		name: "Demo Intent",
		summary: "Demonstration of intent flow",
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

	console.log("Selecting active intent")
	await hookManager.executeToolWithHooks("select_active_intent", { intent_id: "INT-DEM1" }, async () => "ok")

	console.log("Performing write_file action")
	await hookManager.executeToolWithHooks(
		"write_file",
		{ file_path: "src/hooks/demo-output.txt", content: "hello", mutation_class: "AST_REFACTOR" },
		async () => ({ success: true }),
	)

	console.log("Traces written:")
	const traceService = TraceService.getInstance(workspacePath)
	const traces = await traceService.getTracesByIntent("INT-DEM1")
	console.dir(traces, { depth: null })
}

runDemo().catch(console.error)
