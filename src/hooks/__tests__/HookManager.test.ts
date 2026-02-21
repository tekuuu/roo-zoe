import { hookManager } from "../HookManager"
import { HookContext } from "../types"

describe("HookManager", () => {
	it("runs pre and post hooks in order", async () => {
		const preOrder: string[] = []
		const postOrder: string[] = []

		const preHook1 = async (ctx: HookContext) => {
			preOrder.push("a")
			return { success: true }
		}
		const preHook2 = async (ctx: HookContext) => {
			preOrder.push("b")
			return { success: true }
		}
		const postHook1 = async (ctx: HookContext, res: any) => {
			postOrder.push("x")
		}
		const postHook2 = async (ctx: HookContext, res: any) => {
			postOrder.push("y")
		}

		// register hooks temporarily
		hookManager.registerPreHook(preHook1)
		hookManager.registerPreHook(preHook2)
		hookManager.registerPostHook(postHook1)
		hookManager.registerPostHook(postHook2)

		const result = await hookManager.executeToolWithHooks("dummy", { foo: 1 }, async () => "ok")
		expect(result).toBe("ok")
		expect(preOrder).toEqual(["a", "b"])
		expect(postOrder).toEqual(["x", "y"])
	})

	it("should preserve intent_id between calls", async () => {
		// simulate selecting intent
		await hookManager.executeToolWithHooks("select_active_intent", { intent_id: "INT-123" }, async () => "selected")
		// next tool should see context.intent_id set automatically
		let capturedId: string | null = null
		hookManager.registerPreHook(async (ctx) => {
			capturedId = ctx.intent_id
			return { success: true }
		})
		await hookManager.executeToolWithHooks("write_file", {}, async () => "ok")
		expect(capturedId).toBe("INT-123")
	})
})
