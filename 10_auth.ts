// @ts-ignore
import ee from "@google/earthengine"
import * as fs from "fs";
import type {Iee} from "./eeTypes";
import path from "path";
import {fileURLToPath} from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getDevKey = ()=>{
	const d = fs.readFileSync(path.join(__dirname, './earth-engine-ch-keys.json'), "utf8")
	return JSON.parse(d)
}
const key = process.env.earthEngineKey || getDevKey()

export async function getAuthEarthEngine(): Promise<Iee> {
	await auth()
	await init()
	return ee;
}

async function auth() {
	return new Promise((resolve, reject) => {
		console.log("auth")
		ee.data.authenticateViaPrivateKey(key, resolve, reject)
	})
}

async function init() {
	return new Promise((resolve, reject) => {
		console.log("init")
		ee.initialize(null, null, resolve, reject)
	})
}