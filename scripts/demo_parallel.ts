import { hookManager } from "../src/hooks/HookManager"
import * as fs from "fs/promises"
import * as path from "path"
import { HashUtils } from "../src/hooks/trace/hasher"

async function main() {
	const target = path.join(process.cwd(), "scripts", "demo.txt")
	await fs.writeFile(target, "initial")

	console.log("Starting parallel writes with stale check")

	const op1 = hookManager.executeToolWithHooks(
		"write_file",
		{
			intent_id: "INT-TEST",
			file_path: target,
			content: "first write",
			original_hash: HashUtils.sha256("initial"),
		},
		async () => {
			// simulate delay
			await new Promise((r) => setTimeout(r, 100))
			await fs.writeFile(target, "first write")
			return { success: true }
		},
	)

	const op2 = hookManager.executeToolWithHooks(
		"write_file",
		{
			intent_id: "INT-TEST",
			file_path: target,
			content: "second write",
			original_hash: HashUtils.sha256("initial"),
		},
		async () => {
			await new Promise((r) => setTimeout(r, 200))
			await fs.writeFile(target, "second write")
			return { success: true }
		},
	)

	try {
		const r1 = await op1
		console.log("op1 result", r1)
	} catch (e: any) {
		console.error("op1 error", e.message)
	}

	try {
		const r2 = await op2
		console.log("op2 result", r2)
	} catch (e: any) {
		console.error("op2 error", e.message)
	}

	const final = await fs.readFile(target, "utf-8")
	console.log("final file content", final)
}

main().catch((e) => console.error(e))
