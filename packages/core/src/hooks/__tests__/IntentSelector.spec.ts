import { validateIntentSelection } from "../pre/IntentSelector"
import { HookContext } from "../types"
import { IntentService } from "../intent/IntentService"
import { vi } from "vitest"

describe("IntentSelector", () => {
	let originalGetInstance: any

	beforeAll(() => {
		originalGetInstance = IntentService.getInstance
	})

	afterAll(() => {
		IntentService.getInstance = originalGetInstance
	})

	function mockIntentService(intent: any | null) {
		const fake = {
			initialize: vi.fn().mockResolvedValue(void 0),
			getIntent: vi.fn().mockResolvedValue(intent),
		}
		IntentService.getInstance = () => fake as any
		return fake as any
	}

	it("should fail when no intent provided", async () => {
		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: null,
			tool_name: "write_file",
			tool_args: {},
			authorization_status: "pending",
		}

		const result = await validateIntentSelection(context)
		expect(result.success).toBe(false)
		expect(result.error).toContain("No active Intent ID")
	})

	it("should fail when intent not found", async () => {
		mockIntentService(null)
		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: null,
			tool_name: "write_file",
			tool_args: { intent_id: "INT-999" },
			authorization_status: "pending",
		}
		const result = await validateIntentSelection(context)
		expect(result.success).toBe(false)
		expect(result.error).toContain("not found")
	})

	it("should succeed with valid intent", async () => {
		const intent = { id: "INT-001", status: "in_progress" }
		mockIntentService(intent)
		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: null,
			tool_name: "write_file",
			tool_args: { intent_id: "INT-001" },
			authorization_status: "pending",
		}
		const result = await validateIntentSelection(context)
		expect(result.success).toBe(true)
		expect(context.intent_id).toBe("INT-001")
	})
})
