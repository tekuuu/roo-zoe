import { BaseTool, ToolCallbacks } from "./BaseTool"
import { Task } from "../task/Task"
import type { ToolUse } from "../../shared/tools"

interface SelectActiveIntentParams {
  intent_id: string
}

export class SelectActiveIntentTool extends BaseTool<"select_active_intent"> {
  readonly name = "select_active_intent" as const

  async execute(params: SelectActiveIntentParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
    const { pushToolResult } = callbacks

    const intentId = params.intent_id || (params as any).intentId

    if (!intentId) {
      task.consecutiveMistakeCount++
      task.recordToolError("select_active_intent")
      pushToolResult(await task.sayAndCreateMissingParamError("select_active_intent", "intent_id"))
      return
    }

    // Record the selected intent on the Task so hooks and other code can access it
    ;(task as any).activeIntentId = intentId

    // Acknowledge selection
    pushToolResult(`Selected active intent: ${intentId}`)
  }

  override async handlePartial(task: Task, block: ToolUse<"select_active_intent">): Promise<void> {
    // No streaming UI necessary for this simple selection tool
    return
  }
}

export const selectActiveIntentTool = new SelectActiveIntentTool()
