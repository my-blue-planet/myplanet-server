import { url } from "node:inspector";
import {getAuthEarthEngine} from "./10_auth.js"
//import {saveImage} from "./20_fetchPreparedImage.js"
import type {Iee, eeImage, eeImageCollection, eeMap, eeGeometry} from "./eeTypes";
//import fs from "node:fs";
import {Mercator} from "./Mercator.js";

//let ee = await getAuthEarthEngine()

type Point = [long: number, lat: number]
type sat =  "sentinel" | "landsat"
type view = "TOA" | "SR"


// usePansat is now removed, see older versions

export class SatAPI {

	public static async sentinelYearlyMedian(p: Point, zoomLevel: number, year: number) {
		let ee = await getAuthEarthEngine()
		const sat = "sentinel"
		const bands = ["B4", "B3", "B2"]
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		const rect = ee.Geometry.Rectangle(...Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel))
		const coll = ee.ImageCollection(this.getCollectionName(sat, "SR"))
			.filter(ee.Filter.calendarRange(year-1, year+1, "year"))
			.filter(ee.Filter.dayOfYear(160, 300))
			.filterBounds(rect)
			.filter(ee.Filter.lt(this.getCloudinessName(sat), 15))
			.select(...bands)
		const img = coll.median()
		const {min, max} = await this.getScale(ee, img, sat, "SR", rect)
		const map = img.getMap({min, max, gamma: 1.5})
		return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
	}

	public static async sentinelCloudfree(p: Point, zoomLevel: number, year: number) {
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		return `https://s2maps-tiles.eu/wmts?layer=s2cloudless-${year}_3857&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&TileMatrix=${zoomLevel}&TileCol=${tileX}&TileRow=${tileY}`
	}

	static async listImages(p: Point, zoomLevel: number) {
		const sat = "sentinel"
		let ee = await getAuthEarthEngine()
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		//const rect = ee.Geometry.Rectangle(...Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel))
		const coll = ee.ImageCollection(this.getCollectionName(sat, "SR")).filterBounds(ee.Geometry.Point(p[0], p[1]))
		const data = await new Promise<{features: ({id: string, properties: any})[]}>((resolve)=>coll.getInfo(resolve))
		const imgs = data.features.map((i)=>({id: i.id, clouds: i.properties[this.getCloudinessName(sat)], timestamp: i.properties["system:time_start"]}))
		//console.log(data.features[0].properties)//data);
		return imgs
	}

	static async checkSat(p: Point, zoomLevel: number, datasrc: "night" | "pop" | "nox") {
		const sources = {
			//"night": "NOAA/DMSP-OLS/NIGHTTIME_LIGHTS",
			"night": "NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG",
			"pop": "CIESIN/GPWv4/unwpp-adjusted-population-density", //5 year steps, https://medium.com/google-earth/the-global-population-of-the-world-ae8b8b362c99
			//"pop": "CIESIN/GPWv4/population-count", //5 year steps, https://medium.com/google-earth/the-global-population-of-the-world-ae8b8b362c99
			"nox": "COPERNICUS/S5P/OFFL/L3_NO2"
		}
		const sat = sources[datasrc]
		console.log(sat);
		
		let ee = await getAuthEarthEngine()
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		//const rect = ee.Geometry.Rectangle(...Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel))
		let coll = ee.ImageCollection(sat).filterBounds(ee.Geometry.Point(p[0], p[1]))
		if(datasrc === "nox") { //0.001 mol/m^2
			const img = coll.select('NO2_column_number_density').filterDate("2021-01-01", "2021-12-31").mean()
			const map = img.getMap({min: 0, max: 0.000512, palette: ['black', 'white']})  //['white', 'black', 'blue', 'cyan', 'green', 'yellow', 'red', 'purple', 'white']})
			return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
		}
		if(datasrc === "night") { //night
			const img = coll.select('avg_rad').filterDate("2021-01-01", "2021-12-31").median().multiply(512).log()
			const map = img.getMap({min: 5, max: 17, palette: ['black', 'white']})
			return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
		}
		// if(datasrc === "night") { //night
		// 	const img = coll.select('stable_lights').mean()
		// 	const map = img.getMap({min: 0, max: 64, palette: ['black', 'white']})
		// 	return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
		// }
		if(datasrc === "pop") { //pop
			const img = ee.Image(`${sat}/2020`).multiply(512).log()
			const map = img.getMap({min: 0, max: 20, palette: ['black', 'white']})  //['white', 'black', 'blue', 'cyan', 'green', 'yellow', 'red', 'purple', 'white']})
			return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
		}
		const data = await new Promise<{features: ({id: string, properties: any})[]}>((resolve)=>coll.getInfo(resolve))
		//const imgs = data.features.map((i)=>({id: i.id, clouds: i.properties[this.getCloudinessName(sat)], timestamp: i.properties["system:time_start"]}))
		//console.log(data.features[0].properties)//data);
		return data
	}

	static async loadImage(id:string, p: Point, zoomLevel: number) {
		const sat = "sentinel"
		let ee = await getAuthEarthEngine()
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		const rect = ee.Geometry.Rectangle(...Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel))
		const img = ee.Image(id).select(["B4", "B3", "B2"])
		const map = img.getMap(await this.getScale(ee, img, sat, "SR", rect))
		return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)
	}

	public static async createFrameForTimelapse(p: Point, zoomLevel=12, year: any, max=4000) {
		let ee = await getAuthEarthEngine()
		const {tileX, tileY} = Mercator.positionToTileXY(p, zoomLevel)
		const rect = ee.Geometry.Rectangle(...Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel))

		// Get Landsat surface reflectance collections for OLI, ETM+ and TM sensors.
		var oliCol = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR');
		var etmCol= ee.ImageCollection('LANDSAT/LE07/C01/T1_SR');
		var tmCol= ee.ImageCollection('LANDSAT/LT05/C01/T1_SR');

		// Define a collection filter.
		var colFilter = ee.Filter.and(
			ee.Filter.bounds(rect),
			//ee.Filter.calendarRange(120, 270, 'day_of_year'),
			ee.Filter.calendarRange(year-1, year+1, 'year'),
			ee.Filter.lt('CLOUD_COVER', 50)/*,
			ee.Filter.lt('GEOMETRIC_RMSE_MODEL', 10),
			ee.Filter.or(
				ee.Filter.eq('IMAGE_QUALITY', 9),
				ee.Filter.eq('IMAGE_QUALITY_OLI', 9)
			)*/
		);

		// Define function to get and rename bands of interest from OLI.
		function renameOLI(img: eeImage) {
			return img.select(
				['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'pixel_qa'],
				['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa']
			);
		}

		// Define function to get and rename bands of interest from ETM+.
		function renameETM(img: eeImage) {
			return img.select(
				['B1', 'B2', 'B3', 'B4', 'B5', 'B7', 'pixel_qa'],
				['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa']
			);
		}

		var coefficients = {
			itcps: ee.Image.constant([0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172]).multiply(10000),
			slopes: ee.Image.constant([0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071])
		};

		// Define function to apply harmonization transformation.
		function etm2oli(img: eeImage) {
			return img.select(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
				.multiply(coefficients.slopes)
				.add(coefficients.itcps)
				.round()
				.toShort()
				.addBands(img.select('pixel_qa')
				);
		}

		// Define function to mask out clouds and cloud shadows.
		function fmask(img: eeImage) {
			var cloudShadowBitMask = 1 << 3;
			var cloudsBitMask = 1 << 5;
			var qa = img.select('pixel_qa');
			var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
				.and(qa.bitwiseAnd(cloudsBitMask).eq(0));
			return img.updateMask(mask);
		}

		// Define function to prepare OLI images.
		function prepOLI(img: eeImage) {
			var orig = img;
			img = renameOLI(img);
			//img = fmask(img);
			//img = calcNBR(img);
			return img //ee.Image(img.copyProperties(orig, orig.propertyNames()));
		}

		// Define function to prepare ETM+ images.
		function prepETM(img: eeImage) {
			var orig = img;
			img = renameETM(img);
			//img = fmask(img);
			img = etm2oli(img);
			//img = calcNBR(img);
			return ee.Image(img.copyProperties(orig, orig.propertyNames()));
		}


		// Filter collections and prepare them for merging.
		oliCol = oliCol.filter(colFilter).map(prepOLI);
		etmCol= etmCol.filter(colFilter).map(prepETM);
		tmCol= tmCol.filter(colFilter).map(prepETM);

		var col = oliCol.merge(tmCol).merge(oliCol)

		var img = col.select("Red", "Green", "Blue").median()
		const map = img.getMap({min: 0, max});

		return ee.data.getTileUrl(map, tileX, tileY, zoomLevel)

	}

	private static elevationCache: Record<string, {url: URL, min: number, max: number}> = {}
	static async elevation([long, lat]: Point, zoomLevel: number) {
		const key = `${long}-${lat}-${zoomLevel}`
		if(this.elevationCache[key]) return this.elevationCache[key]
		const ee = await getAuthEarthEngine()
		var elevData = ee.ImageCollection("projects/sat-io/open-datasets/GLO-30");
		const elevImg = elevData.mosaic().setDefaultProjection('EPSG:3857',null,30)
		const {tileX, tileY} = Mercator.positionToTileXY([long, lat], zoomLevel)
		const bounds: [number, number, number, number] = Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel)
		const {b1_max: max, b1_min: min} = await Reducers.getMinMax(ee, elevImg, ee.Geometry.Rectangle(...bounds)) as any
		// const high = 9000
		// const low = high-2**14
		// const step = 0.25  // = 2**14 / 256**2
		// const liftscale = e2.add(ee.Image.constant(-low)).multiply(ee.Image.constant(1/step))
		// const r = liftscale.divide(ee.Image.constant(256))
		// const g = liftscale.mod(ee.Image.constant(256))
		// const result = ee.Image.rgb(r, g, g)
		//const pos = getPos(long, lat, zoomLevel)
		// const tileRect = ee.Geometry.Rectangle(long-1, lat-1, long+1, lat+1)
		// const v = result.reduceRegion({reducer: ee.Reducer.mean(), geometry: tileRect, scale: 5000,	bestEffort: true}).getInfo()
		// //console.log(v);
		const map = elevImg.getMap({min, max})
		// const v = srtm.getThumbURL({
		// 	min: 0,
		// 	max: 8000,
		// 	dimensions: 1000
		// })
		// await saveImage(v, "imgtest/heightmapWorld.png")
		//console.log(result.getInfo());
		let data = {url: ee.data.getTileUrl(map, tileX, tileY, zoomLevel), min, max}
		// for(let y = pos.tileCoords.y - 1; y <=pos.tileCoords.y + 1; y++) {
		// 	for(let x = pos.tileCoords.x - 1; x <=pos.tileCoords.x + 1; x++) {
		// 		// const r = await this.saveTileIfNotExists(map, {x, y}, `_${method}_${String(year)}`)
		// 		// data.push(r[0])
		// 		const url = ee.data.getTileUrl(map, x, y, zoomLevel)
		// 		data.push(url)
		// 	}
		// }
		this.elevationCache[key] = data
		setTimeout(()=>delete this.elevationCache[key], 3600000)
		return data
	}

	static async elevation2([long, lat]: Point, zoomLevel: number, forceMin?: number, forceMax?: number) {
		const key = `e4-${long}-${lat}-${zoomLevel}-${forceMin ?? "auto"}-${forceMax ?? "auto"}`
		if(this.elevationCache[key]) return this.elevationCache[key]
		const ee = await getAuthEarthEngine()
		var elevImg = ee.Image("CGIAR/SRTM90_V4");
		//const elevImg = elevData.mosaic().setDefaultProjection('EPSG:3857',null,30)
		const {tileX, tileY} = Mercator.positionToTileXY([long, lat], zoomLevel)
		const bounds: [number, number, number, number] = Mercator.tileXYToBoundingBox(tileX, tileY, zoomLevel)
		const getMinMax = async () => {
			if(forceMin !== undefined && forceMax !== undefined) return [forceMin, forceMax]
			const {elevation_max, elevation_min} = await Reducers.getMinMax(ee, elevImg, ee.Geometry.Rectangle(...bounds)) as any
			return [elevation_min, elevation_max]
		}
		const [min, max] = await getMinMax()
		
		// const high = 9000
		// const low = high-2**14
		// const step = 0.25  // = 2**14 / 256**2
		// const liftscale = e2.add(ee.Image.constant(-low)).multiply(ee.Image.constant(1/step))
		// const r = liftscale.divide(ee.Image.constant(256))
		// const g = liftscale.mod(ee.Image.constant(256))
		// const result = ee.Image.rgb(r, g, g)
		//const pos = getPos(long, lat, zoomLevel)
		// const tileRect = ee.Geometry.Rectangle(long-1, lat-1, long+1, lat+1)
		// const v = result.reduceRegion({reducer: ee.Reducer.mean(), geometry: tileRect, scale: 5000,	bestEffort: true}).getInfo()
		// //console.log(v);
		const map = elevImg.getMap({min, max})
		// const v = srtm.getThumbURL({
		// 	min: 0,
		// 	max: 8000,
		// 	dimensions: 1000
		// })
		// await saveImage(v, "imgtest/heightmapWorld.png")
		//console.log(result.getInfo());
		let data = {url: ee.data.getTileUrl(map, tileX, tileY, zoomLevel), min, max}
		// for(let y = pos.tileCoords.y - 1; y <=pos.tileCoords.y + 1; y++) {
		// 	for(let x = pos.tileCoords.x - 1; x <=pos.tileCoords.x + 1; x++) {
		// 		// const r = await this.saveTileIfNotExists(map, {x, y}, `_${method}_${String(year)}`)
		// 		// data.push(r[0])
		// 		const url = ee.data.getTileUrl(map, x, y, zoomLevel)
		// 		data.push(url)
		// 	}
		// }
		this.elevationCache[key] = data
		setTimeout(()=>delete this.elevationCache[key], 3600000)
		return data
	}

	private static getCollectionName(sat: sat, view: view) {
		const sources = {
			sentinel: `COPERNICUS/S2_${view === "SR" ? "SR_" : ""}HARMONIZED`,
			landsat: `LANDSAT/LT05/C01/T1_${view}` //LANDSAT/LC08/
		}
		return sources[sat]
	}
	private static getCloudinessName(sat: sat) {
		return sat === "sentinel" ? "CLOUDY_PIXEL_PERCENTAGE" : "CLOUD_COVER"
	}

	private static async getScale(ee: Iee, img: eeImage, sat: sat, view: view, areaOfInterest: eeGeometry) {
		if(sat === "sentinel") return {min: 0, max: 10000}
		else if(view === "SR") return {min: 0, max: 8000}
		else {
			const mean = Math.max(...Object.values<number>(await Reducers.getMean(ee, img, areaOfInterest) as number[]))
			const stdDev = Math.max(...Object.values<number>(await Reducers.stdDev(ee, img, areaOfInterest) as number[]))
			console.log({stdDev, mean});
			return {min: 0, max: mean + 3 * stdDev}
		}
	}
}

class Reducers {
	static getValue(ee: Iee, img: eeImage, geometry: eeGeometry, reducer: unknown) {
		return new Promise((resolve)=>{
			img.reduceRegion({reducer, geometry, scale: 60, bestEffort: true}).getInfo(resolve)
		})
	}
	static getMean(ee: Iee, img: eeImage, geometry: eeGeometry) {
		return this.getValue(ee, img, geometry, ee.Reducer.mean())
	}
	static getMax(ee: Iee, img: eeImage, geometry: eeGeometry) {
		return this.getValue(ee, img, geometry, ee.Reducer.max())
	}
	static stdDev(ee: Iee, img: eeImage, geometry: eeGeometry) {
		return this.getValue(ee, img, geometry, ee.Reducer.stdDev())
	}
	static getMinMax(ee: Iee, img: eeImage, geometry: eeGeometry) {
		return this.getValue(ee, img, geometry, ee.Reducer.minMax())
	}
}