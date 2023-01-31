import * as path from "path"
import * as fs from "fs";
import {fileURLToPath} from "url";

const DEV = process.platform.startsWith("win")

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root_data = DEV ? path.join(__dirname, "../root_data") : "/data"
export const scenesFolder = path.join(root_data, "myplanet", "scenes")

function createFolderIfNotExists(pathToCreate: string) {
	if(!fs.existsSync(pathToCreate)) {
		let dirpath = path.extname(pathToCreate) !== "" ? path.dirname(pathToCreate) : pathToCreate
		fs.mkdirSync(dirpath, { recursive: true })
	}
}

export async function saveScene(label: string, data: string) {
	await createFolderIfNotExists(scenesFolder)
	const name = `${label || "scene"}-${Date.now()}.json`
	const filepath = path.join(scenesFolder, name)
	fs.writeFileSync(filepath, data, {encoding: "utf-8"})
	return name
}

export async function getScenesIndex() {
	return fs.readdirSync(scenesFolder).filter(f=>f.endsWith(".json"))
}