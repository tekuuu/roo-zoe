import { HookContext, HookResult } from "../types"
import { IntentService } from "../intent/IntentService"
import * as path from "path"
import * as minimatch from "minimatch"

const intentService = IntentService.getInstance(process.cwd())

export const enforceScope = async (context: HookContext): Promise<HookResult> => {
	// Only enforce on write operations
	const writeTools = ["write_file", "create_file", "edit_file", "apply_fix"]

	if (!writeTools.includes(context.tool_name)) {
		return { success: true }
	}

	if (!context.intent_id) {
		return {
			success: false,
			error: "Scope enforcement requires an active intent. Call select_active_intent first.",
		}
	}

	const intent = await intentService.getIntent(context.intent_id)

	if (!intent) {
		return { success: true }
	}

	// Determine target file path
	const targetFile = context.tool_args.file_path || context.tool_args.path || context.tool_args.file

	if (!targetFile) {
		return { success: true }
	}

	// If tool provided an original_hash, verify file hasn't changed
	if (context.tool_args.original_hash) {
		try {
			const fs = await import("fs/promises")
			const existing = await fs.readFile(targetFile, "utf-8")
			const { HashUtils } = await import("../trace/hasher")
			const actualHash = HashUtils.sha256(existing)
			if (actualHash !== context.tool_args.original_hash) {
				return {
					success: false,
					error: `Stale File: ${targetFile} has changed since the agent read it. Please re-fetch the latest version and replay your changes.`,
					requires_human_intervention: false,
				}
			}
		} catch {
			// ignore if file doesn't exist or read fails
		}
	}

	// Normalize the path
	const normalizedPath = path.normalize(targetFile)

	// Check if file matches any owned_scope pattern
	const isAuthorized = intent.owned_scope.some((pattern: string) => {
		return (
			minimatch(normalizedPath, pattern, { dot: true }) ||
			minimatch(normalizedPath, `**/${pattern}`, { dot: true })
		)
	})

	if (!isAuthorized) {
		return {
			success: false,
			error: `Scope Violation: Intent "${intent.id}" is not authorized to modify "${targetFile}". This intent only has scope over: ${intent.owned_scope.join(", ")}. Request scope expansion via intent update.`,
			requires_human_intervention: false,
		}
	}

	return { success: true }
}
