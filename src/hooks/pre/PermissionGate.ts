import { HookContext, HookResult } from "../types"
import { CommandClassifier } from "../security/CommandClassifier"
import * as vscode from "vscode"

export const checkPermissions = async (context: HookContext): Promise<HookResult> => {
	// Only check shell commands
	const commandTools = ["execute_command", "bash", "shell"]

	if (!commandTools.includes(context.tool_name)) {
		return { success: true }
	}

	const command = context.tool_args.command || context.tool_args.cmd || ""

	const classifier = new CommandClassifier()
	const classification = classifier.classify(command)

	if (classification.risk_level === "safe") {
		return { success: true }
	}

	if (classification.risk_level === "destructive") {
		// Block and request human intervention
		const userResponse = await vscode.window.showWarningMessage(
			`AI Agent wants to execute potentially destructive command:\n\n${command}\n\nClassification: ${classification.category}\n\nDo you want to allow this?`,
			{ modal: true },
			"Allow Once",
			"Deny",
			"Allow and Trust",
		)

		if (userResponse === "Deny") {
			return {
				success: false,
				error: `User denied execution of: ${command}`,
				requires_human_intervention: true,
			}
		}

		// Log the approval
		if (userResponse === "Allow and Trust") {
			classifier.addToWhitelist(command)
		}
	}

	return { success: true }
}
