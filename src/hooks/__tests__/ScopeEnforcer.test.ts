import { enforceScope } from "../pre/ScopeEnforcer"
import { HookContext } from "../types"
import { IntentService } from "../intent/IntentService"
import { vi } from "vitest"

// minimal fake intent object
type FakeIntent = any

describe("ScopeEnforcer", () => {
	let originalGetInstance: any

	beforeAll(() => {
		originalGetInstance = IntentService.getInstance
	})

	afterAll(() => {
		IntentService.getInstance = originalGetInstance
	})

	function mockIntentService(intent: FakeIntent) {
		const fake = {
			initialize: vi.fn().mockResolvedValue(void 0),
			getIntent: vi.fn().mockResolvedValue(intent),
		}
		IntentService.getInstance = () => fake as any
		return fake as any
	}

	it("should block write to unauthorized file", async () => {
		const intent = {
			id: "INT-001",
			owned_scope: ["src/auth/**"],
			status: "in_progress",
		}

		mockIntentService(intent)

		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: "INT-001",
			tool_name: "write_file",
			tool_args: {
				file_path: "/workspace/src/unauthorized.ts",
				content: 'console.log("test")',
			},
			authorization_status: "pending",
		}

		const result = await enforceScope(context)

		expect(result.success).toBe(false)
		expect(result.error).toContain("Scope Violation")
	})

	it("should allow write to authorized file", async () => {
		const intent = {
			id: "INT-001",
			owned_scope: ["src/auth/**"],
			status: "in_progress",
		}

		mockIntentService(intent)

		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: "INT-001",
			tool_name: "write_file",
			tool_args: {
				file_path: "/workspace/src/auth/middleware.ts",
				content: 'console.log("auth")',
			},
			authorization_status: "pending",
		}

		const result = await enforceScope(context)
		expect(result.success).toBe(true)
	})

	it("should detect stale file when original_hash mismatches", async () => {
		const intent = {
			id: "INT-001",
			owned_scope: ["src/auth/**"],
			status: "in_progress",
		}
		mockIntentService(intent)

		// create a temporary file with content
		const fs = await import("fs/promises")
		const tmpPath = "/tmp/testfile.ts"
		await fs.writeFile(tmpPath, "original")
		const { HashUtils } = await import("../../hooks/trace/hasher")
		const originalHash = HashUtils.sha256("original")

		const context: HookContext = {
			state: "PRE_HOOK_ANALYSIS",
			intent_id: "INT-001",
			tool_name: "write_file",
			tool_args: {
				file_path: tmpPath,
				content: "new",
				original_hash: originalHash,
			},
			authorization_status: "pending",
		}

		// modify file to simulate external change
		await fs.writeFile(tmpPath, "modified")

		const result = await enforceScope(context)
		expect(result.success).toBe(false)
		expect(result.error).toContain("Stale File")
	})
})
