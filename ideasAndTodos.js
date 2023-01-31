const ee = require('@google/earthengine');
const privateKey = require('./earth-engine-ch-keys.json');
const fs = require('fs');
const axios = require('axios');

async function auth() {
	return new Promise((resolve, reject) => {
		ee.data.authenticateViaPrivateKey(privateKey, resolve, reject)
	})
}

async function init() {
	return new Promise((resolve, reject) => {
		ee.initialize(null, null, resolve, reject)
	})
}

async function downloadImage(url, image_path) {
	return axios({
		url,
		responseType: 'stream',
	}).then(
		response =>
			new Promise((resolve, reject) => {
				response.data
					.pipe(fs.createWriteStream(image_path))
					.on('finish', () => resolve())
					.on('error', e => reject(e));
			}),
	);
}

async function heightmapWorld() {
	const srtm = ee.Image('CGIAR/SRTM90_V4');
	const v = srtm.getThumbURL({
		min: 0,
		max: 8000,
		dimensions: 1000
	})
	await downloadImage(v, "img/heightmapWorld.png")
}

async function heightmapSwitzerland() {
	const srtm = ee.Image('CGIAR/SRTM90_V4');
	var mask = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
		.filter(ee.Filter.eq('country_na', 'Switzerland'));
	var clipped = srtm.clip(mask);
	const v = clipped.getThumbURL({
		min: 0,
		max: 4500,
		dimensions: 6000,
		region: ee.Geometry.Rectangle([5.9, 47.8, 10.7, 45.8]),
		crs: 'EPSG:3857'
	})
	await downloadImage(v, "img/heightmapSwitzerland.png")
}

async function worldElevationGMTED() {
	const srtm = ee.Image('USGS/GMTED2010');
	const v = srtm.getThumbURL({
		min: 0,
		max: 4500,
		dimensions: 1000,
	})
	await downloadImage(v, "img/heightmapGMTED.png")
}

async function current2() {
	const c = ee.ImageCollection("ECMWF/ERA5/MONTHLY");
	const v = c.getVideoThumbURL({
		min: 250,
		max: 310,
		dimensions: 200,
		bands: ['mean_2m_air_temperature'],
		palette: [
			"#000080","#0000D9","#4000FF","#8000FF","#0080FF","#00FFFF",
			"#00FF80","#80FF00","#DAFF00","#FFFF00","#FFF500","#FFDA00",
			"#FFB000","#FFA400","#FF4F00","#FF2500","#FF0A00","#FF00FF",
		]
	})
	await downloadImage(v, "img/temp.gif")
}


async function vegAfrica() {
	// const ndviCol = ee.ImageCollection('MODIS/006/MOD13A2')
	// 	.filterDate('2018-01-01', '2019-01-01')
	// 	.select('NDVI');

		// Make a day-of-year sequence from 1 to 365 with a 16-day step.
	var doyList = ee.List.sequence(1, 365, 16);

	// Import a MODIS NDVI collection.
	var ndviCol = ee.ImageCollection('MODIS/006/MOD13A2').select('NDVI');

	// Map over the list of days to build a list of image composites.
	var ndviCompList = doyList.map(function(startDoy) {
		// Ensure that startDoy is a number.
		startDoy = ee.Number(startDoy);

		// Filter images by date range; starting with the current startDate and
		// ending 15 days later. Reduce the resulting image collection by median.
		return ndviCol
			.filter(ee.Filter.calendarRange(startDoy, startDoy.add(15), 'day_of_year'))
			.reduce(ee.Reducer.median());
	});

	// Define a mask to clip the NDVI data by.
	var mask = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
		.filter(ee.Filter.eq('wld_rgn', 'Africa'));

	// Define the regional bounds of animation frames.
	var region = ee.Geometry.Polygon(
	[[[-18.698368046353494, 38.1446395611524],
		[-18.698368046353494, -36.16300755581617],
		[52.229366328646506, -36.16300755581617],
		[52.229366328646506, 38.1446395611524]]],
	null, false
	);

	// Convert the image List to an ImageCollection.
	var ndviCompCol = ee.ImageCollection.fromImages(ndviCompList);


	// Define RGB visualization parameters.
var visParams = {
  min: 0.0,
  max: 9000.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};

// Create RGB visualization images for use as animation frames.
var rgbVis = ndviCompCol.map(function(img) {
  return img.visualize(visParams).clip(mask);
});

	var url = rgbVis.getVideoThumbURL({
		dimensions: 1000,
		region
	})

	await downloadImage(url, "img/veg.gif")
}

async function vegEU() {
	// const ndviCol = ee.ImageCollection('MODIS/006/MOD13A2')
	// 	.filterDate('2018-01-01', '2019-01-01')
	// 	.select('NDVI');

		// Make a day-of-year sequence from 1 to 365 with a 16-day step.
	var doyList = ee.List.sequence(1, 365, 16);

	// Import a MODIS NDVI collection.
	var ndviCol = ee.ImageCollection('MODIS/006/MOD13A2').select('NDVI');

	// Map over the list of days to build a list of image composites.
	var ndviCompList = doyList.map(function(startDoy) {
		// Ensure that startDoy is a number.
		startDoy = ee.Number(startDoy);

		// Filter images by date range; starting with the current startDate and
		// ending 15 days later. Reduce the resulting image collection by median.
		return ndviCol
			.filter(ee.Filter.calendarRange(startDoy, startDoy.add(15), 'day_of_year'))
			.reduce(ee.Reducer.median());
	});

	// Define a mask to clip the NDVI data by.
	var mask = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
		.filter(ee.Filter.eq('wld_rgn', 'Europe'));

	// Define the regional bounds of animation frames.
	var region = ee.Geometry.Polygon(
	[[[-18.698368046353494, 32],
		[-18.698368046353494, 78],
		[52.229366328646506, 78],
		[52.229366328646506, 32]]],
	null, false
	);

	// Convert the image List to an ImageCollection.
	var ndviCompCol = ee.ImageCollection.fromImages(ndviCompList);


	// Define RGB visualization parameters.
var visParams = {
  min: 0.0,
  max: 9000.0,
  palette: [
    'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718', '74A901',
    '66A000', '529400', '3E8601', '207401', '056201', '004C00', '023B01',
    '012E01', '011D01', '011301'
  ],
};

// Create RGB visualization images for use as animation frames.
var rgbVis = ndviCompCol.map(function(img) {
  return img.visualize(visParams).clip(mask);
});

	var url = rgbVis.getVideoThumbURL({
		dimensions: 1000,
		region
	})

	await downloadImage(url, "img/vegEu.gif")
}



async function run() {
	await auth()
	await init()
	await current2()
}

run()

// async function heightmapWorld(long: number, lat: number, zoomLevel: number) {
// 	const srtm = ee.Image('CGIAR/SRTM90_V4');
// 	const v = srtm.getThumbURL({
// 		min: 0,
// 		max: 8000,
// 		dimensions: 1000
// 	})
// 	await saveImage(v, "imgtest/heightmapWorld.png")
// }

// async saveTileIfNotExists(map: eeMap, tileCoords: {x: number, y: number}, suffix: string): Promise<[string, boolean]> {
// 	const {x, y} = tileCoords
// 	const {zoomLevel, usePanSat, satelliteSource, view} = this.config
// 	const filename = `./tiles/${satelliteSource}_${view}_${usePanSat ? "PSy" : "PSn"}_${x}_${y}_${zoomLevel}_${suffix}.png`
// 	const exists = fs.existsSync(filename)
// 	if (!exists) {
// 	const url = ee.data.getTileUrl(map, x, y, zoomLevel)
// 	await saveImage(url, filename)
// }
// return [filename, exists]
// }

// async pickBest(long: number, lat: number, year: number) {
// 	return this.loadImages(long, lat, year, "best")
// }

// private calculateBest(coll: eeImageCollection, bands: string[] = ["B4", "B3", "B2"]): eeImage {
// 	let best = coll.sort(this.config.satelliteSource === "sentinel" ? 'CLOUDY_PIXEL_PERCENTAGE' : 'CLOUD_COVER').first()
// 	let result = best.select(...bands)
// 	if(this.config.usePanSat && this.config.satelliteSource === "landsat") {
// 		const pan = best.select('B8');
// 		// Convert to HSV, swap in the pan band, and convert back to RGB.
// 		var huesat = result.rgbToHsv().select('hue', 'saturation');
// 		result = ee.Image.cat(huesat, pan).hsvToRgb();
// 	}
// 	return result
// }

// 'SKYSAT/GEN-A/PUBLIC/ORTHO/RGB' high resolution, but only small spots e.g. Zurich

//TODO
//MODIS Land Cover Type Yearly Global 500m

