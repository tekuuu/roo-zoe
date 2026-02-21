import { HookContext } from "../types"
import { TraceService } from "../trace/TraceService"
import { HashUtils } from "../trace/hasher"
import * as vscode from "vscode"
import * as child_process from "child_process"
import * as util from "util"
import * as fs from "fs/promises"
import * as path from "path"

const exec = util.promisify(child_process.exec)

async function getGitRevision(): Promise<string | null> {
	try {
		const { stdout } = await exec("git rev-parse HEAD")
		return stdout.trim()
	} catch {
		return null
	}
}

function determineMutationClass(context: HookContext, result: any): string {
	// naive classification based on tool
	if (context.tool_name === "write_file") return "AST_REFACTOR"
	if (context.tool_name === "create_file") return "INTENT_EVOLUTION"
	return "BUG_FIX"
}

export const logExecution = async (context: HookContext, result: any): Promise<void> => {
	// Only log mutations
	const mutationTools = ["write_file", "create_file", "edit_file", "apply_fix"]

	if (!mutationTools.includes(context.tool_name)) {
		return
	}

	if (!context.intent_id) {
		console.warn("No intent_id for trace logging")
		return
	}

	try {
		const mutationClass = context.tool_args.mutation_class || determineMutationClass(context, result)

		// derive path and content
		let filePath = context.tool_args.file_path || context.tool_args.path || context.tool_args.file
		let content: string = context.tool_args.content || context.tool_args.text || ""

		// if a real file path exists, read its contents for hash and update
		if (filePath && typeof filePath === "string") {
			try {
				const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
				const data = await fs.readFile(abs, "utf-8")
				content = data
			} catch {
				// ignore read errors
			}
		}

		const contentHash = HashUtils.sha256(content)

		const gitRevision = await getGitRevision()

		const traceEntry = {
			id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date().toISOString(),
			vcs: {
				revision_id: gitRevision || "uncommitted",
			},
			intent_id: context.intent_id,
			mutation_class: mutationClass,
			files: [
				{
					relative_path: filePath,
					conversations: [
						{
							url: context.tool_args.session_id || "default",
							contributor: {
								entity_type: "AI",
								model_identifier: "roo-code-ai",
							},
							ranges: [
								{
									start_line: 1,
									end_line: content.split("\n").length,
									content_hash: contentHash,
								},
							],
							related: [
								{
									type: "intent",
									value: context.intent_id,
								},
							],
						},
					],
				},
			],
		}

		const traceService = TraceService.getInstance()
		await traceService.appendTrace(traceEntry as any)
	} catch (err: any) {
		console.error("TraceLogger error", err)
	}
}
