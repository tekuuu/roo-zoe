import { HookContext } from "../types"
import { IntentService } from "../intent/IntentService"
import * as path from "path"

const intentService = IntentService.getInstance(process.cwd())

export const updateMap = async (context: HookContext, result: any): Promise<void> => {
	if (!context.intent_id) return
	const filePath = context.tool_args.file_path || context.tool_args.path || context.tool_args.file || null
	if (!filePath) return

	try {
		await intentService.addFileToIntentMap(context.intent_id, filePath)
	} catch (err) {
		console.error("IntentMapper error", err)
	}
}
