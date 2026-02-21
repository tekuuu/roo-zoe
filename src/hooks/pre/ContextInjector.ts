import { HookContext, HookResult } from "../types"
import { IntentService } from "../intent/IntentService"
import { TraceService } from "../trace/TraceService"

// services will be fetched lazily inside handlers to allow tests to
// override or reinitialize the singleton during setup.

function buildIntentContextBlock(intent: any, recentTraces: any[]): string {
	const lines: string[] = []
	lines.push("<!-- Intent Context -->")
	lines.push(`Intent: ${intent.id} - ${intent.name}`)
	lines.push("Constraints:")
	intent.constraints.forEach((c: string) => lines.push(`  - ${c}`))
	lines.push("Scope:")
	intent.owned_scope.forEach((s: string) => lines.push(`  - ${s}`))

	if (recentTraces.length) {
		lines.push("Recent traces:")
		for (const trace of recentTraces) {
			lines.push(`  - ${trace.files?.[0]?.relative_path || "unknown"} (${trace.mutation_class})`)
		}
	}

	lines.push("<!-- End Intent Context -->")

	return lines.join("\n")
}

export const injectContext = async (context: HookContext): Promise<HookResult> => {
	if (!context.intent_id) {
		return { success: true } // No context to inject
	}

	try {
		// Get the active intent
		const intentService = IntentService.getInstance()
		const intent = await intentService.getIntent(context.intent_id)

		if (!intent) {
			return { success: true }
		}

		// Get recent traces for this intent
		const traceService = TraceService.getInstance()
		const recentTraces = await traceService.getTracesByIntent(
			context.intent_id,
			5, // Last 5 traces
		)

		const contextBlock = buildIntentContextBlock(intent, recentTraces)

		// Attach to args so tools can include it in prompts
		context.tool_args.intent_context = contextBlock

		return { success: true, data: contextBlock }
	} catch (err: any) {
		return { success: false, error: err.message }
	}
}
