import { HookContext, HookResult } from "../types"
import { IntentService } from "../intent/IntentService"

// service will be fetched inside the function so tests can shim getInstance

export const validateIntentSelection = async (context: HookContext): Promise<HookResult> => {
	// Tools that require intent selection
	const intentRequiredTools = ["write_file", "create_file", "edit_file", "execute_command", "bash", "apply_fix"]

	if (!intentRequiredTools.includes(context.tool_name)) {
		return { success: true }
	}

	// Check if intent_id is provided in tool args or context
	const intentId = context.tool_args.intent_id || context.intent_id

	if (!intentId) {
		return {
			success: false,
			error: "No active Intent ID provided. You must call select_active_intent(intent_id: string) before executing any code-modifying tools.",
			requires_human_intervention: false,
		}
	}

	// Validate the intent exists and is active
	const intentService = IntentService.getInstance()
	const intent = await intentService.getIntent(intentId)

	if (!intent) {
		return {
			success: false,
			error: `Intent ID "${intentId}" not found in active_intents.yaml. Please select a valid intent.`,
			requires_human_intervention: false,
		}
	}

	if (intent.status === "completed") {
		return {
			success: false,
			error: `Intent "${intentId}" is already completed. Please select a new intent or mark this one as in_progress.`,
			requires_human_intervention: false,
		}
	}

	// Update context with validated intent
	context.intent_id = intentId

	return { success: true }
}

// Tool definition for Copilot to use
export const selectActiveIntentTool = {
	name: "select_active_intent",
	description:
		"Selects the active intent for the current task. This must be called before any code-modifying operations. The system will inject the intent constraints and scope into the context.",
	parameters: {
		type: "object",
		properties: {
			intent_id: {
				type: "string",
				description: 'The Intent ID to activate (e.g., "INT-001")',
			},
		},
		required: ["intent_id"],
	},
}
