import {readdirSync, writeFileSync, existsSync, mkdirSync, copyFileSync} from "fs";

const srcdir = "./node_modules/myplanet-tasks/compiledTasks"
const localdir = "./myplanet-tasks"

async function loadFiles() {
	const taskfiles = readdirSync(srcdir).filter(f=>f.endsWith(".json"))
	if (!existsSync(localdir)){
		mkdirSync(localdir);
	}
	for(let f of taskfiles) {
		copyFileSync(`${srcdir}/${f}`, `${localdir}/${f}`);
	}
	writeFileSync(`${localdir}/index.json`, JSON.stringify(taskfiles), {encoding: "utf8"})
}

loadFiles().then()

