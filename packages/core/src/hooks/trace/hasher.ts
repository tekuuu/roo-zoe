import * as crypto from "crypto"

export class HashUtils {
	public static sha256(input: string): string {
		return crypto.createHash("sha256").update(input, "utf8").digest("hex")
	}
}
