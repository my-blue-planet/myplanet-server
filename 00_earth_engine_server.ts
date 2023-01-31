import express, {Express, NextFunction, Request, Response} from "express"
import path from "node:path";
import url, { fileURLToPath } from "node:url";

//const path = require("path")
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {SatAPI} from "./00_api.js"
import {getScenesIndex, saveScene, scenesFolder} from "./00_scenes_api.js"

//import "./00_test_examples.js"
// const sentinel = new MultispectralSatellite()

export const earthEngineApp = express();

earthEngineApp.use((req, res, next) => {
	res.header("Cross-Origin-Embedder-Policy", "require-corp");
	res.header("Cross-Origin-Opener-Policy", "same-origin");
	next();
});

earthEngineApp.use("/pure.html", (req: Request, res: Response) => res.sendFile(path.join(__dirname, "../pure.html")))
earthEngineApp.use("/uploadtest.html", (req: Request, res: Response) => res.sendFile(path.join(__dirname, "../uploadtest.html")))
earthEngineApp.use("/tiles", express.static(path.join(__dirname, "../tiles")))

for(let channel of ["median", "vis"]) {
	earthEngineApp.use(`/${channel}`, async (req: Request, res: Response, next: NextFunction) => {
		try {
			console.log(channel, req.query)
			const {long, lat, zoomLevel, year} = req.query
			//const url = await SatAPI.sentinelYearlyMedian([Number(long!), Number(lat!)], Number(zoomLevel!), Number(year!))
			const url = await SatAPI.sentinelCloudfree([Number(long!), Number(lat!)], Number(zoomLevel!), Number(year!))
			res.send({url})
		}
		catch(e) {next(e)}
	})
}

for(let channel of ["pop", "nox", "night"] as ("pop" | "nox" | "night")[]) {
	earthEngineApp.use(`/${channel}`, async (req: Request, res: Response, next: NextFunction) => {
		try {
			console.log(channel, req.query)
			const {long, lat, zoomLevel} = req.query
			//const url = await SatAPI.sentinelYearlyMedian([Number(long!), Number(lat!)], Number(zoomLevel!), Number(year!))
			const url = await SatAPI.checkSat([Number(long!), Number(lat!)], Number(zoomLevel!), channel)
			res.send({url})
		}
		catch(e) {next(e)}
	})
}



earthEngineApp.use("/timelapsevis", async (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log("timelapsevis", req.query);
		const {long, lat, zoomLevel, year} = req.query
		const url = await SatAPI.createFrameForTimelapse([Number(long!), Number(lat!)], Number(zoomLevel!), Number(year)!)
		res.send({url})
	}
	catch(e) {next(e)}
})

earthEngineApp.use("/elevation", async (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log(req.query);
		const {long, lat, zoomLevel, min, max} = req.query
		const links = await SatAPI.elevation2([Number(long!), Number(lat!)], Number(zoomLevel!), min===undefined ? min : Number(min), max===undefined ? max : Number(max))
		console.log(links);
		res.send(links)
	}
	catch(e) {next(e)}
})

earthEngineApp.use("/listImages", async (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log(req.query);
		const {long, lat, zoomLevel} = req.query
		const imgs = await SatAPI.listImages([Number(long!), Number(lat!)], Number(zoomLevel!))
		console.log(imgs);
		res.send(imgs)
	}
	catch(e) {next(e)}
})

earthEngineApp.use("/loadImage", async (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log(req.query);
		const {id, long, lat, zoomLevel} = req.query
		const url = await SatAPI.loadImage(String(id), [Number(long!), Number(lat!)], Number(zoomLevel!))
		console.log({url});
		res.send({url})
	}
	catch(e) {next(e)}
})

earthEngineApp.use("/check", async (req: Request, res: Response, next: NextFunction) => {
	try {
		console.log(req.query);
		const {sat, long, lat, zoomLevel} = req.query
		const url = await SatAPI.checkSat([Number(long!), Number(lat!)], Number(zoomLevel!), sat as "night" | "pop" | "nox")
		console.log({url});
		res.send({url})
	}
	catch(e) {next(e)}
})

earthEngineApp.post('/saveScene', async (req: Request, res: Response, next) => {
	try {
		const {label, data} = req.body
		const name = await saveScene(label, data)
		res.json({ok: "ok", name});
	}
	catch(e) {
		next(e)
	}
});

earthEngineApp.get('/getScenes', async (req: Request, res: Response, next) => {
	try {
		res.json(await getScenesIndex());
	}
	catch(e) {
		next(e)
	}
});

console.log("server v24");

earthEngineApp.use("/myplanettasks", express.static(path.join(__dirname, "../myplanet-tasks")))
earthEngineApp.use("/scenes", express.static(scenesFolder))
earthEngineApp.use("/", (req, res, next)=> {
	if(req.url === "/" || req.url === "") {req.url = "/index.html"}
	next()
})
earthEngineApp.use(express.static(path.join(__dirname, "../myplanet-client")))

// earthEngineApp.get('/', async (req: Request, res: Response) => {
// 	res.send("Yay44444444!")
// });

earthEngineApp.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err.stack)
	res.status(500).send('Something broke!')
})
