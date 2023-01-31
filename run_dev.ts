import {earthEngineApp} from "./00_earth_engine_server.js";

import cors from "cors"
import bodyParser from "body-parser"
import express from "express";
import vhost from "vhost";

const app = express()
const port = 11333

const corsOptions: cors.CorsOptions = {
	origin: [/localhost/, /gymburgdorf/, /3e8/, /github.io/, /hidora.com/, /192\.168\.1\.\d+/, /127\.0\.0\.\d+/]
}

app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json({limit: '15mb'})) // parse application/json
app.use(cors(corsOptions))
app.use(vhost("localhost", earthEngineApp))
app.listen(port)


console.log(`Earth Engine Server v11 on http://localhost:${port}`);