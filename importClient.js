import {cpSync} from "fs";

cpSync("./node_modules/myplanet-client/dist", "./myplanet-client", {recursive: true});
