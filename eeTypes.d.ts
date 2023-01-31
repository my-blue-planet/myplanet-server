import {futimes} from "fs";

type cb = Function

export abstract class Iee {
	data: eeData
	initialize(baseurl?: URL | null, tileurl?: URL | null, onSuccess?: cb, onErr?: cb): unknown
	ImageCollection: eeImageCollectionConstructor
	Image: eeImageConstructor
	Geometry: eeGeometryConstructor
	Reducer: {mean(): any, stdDev(): any, median(): any, max(): any, minMax(): any}
	Filter: eeFilterConstructor
}

export interface eeData {
	authenticateViaPrivateKey: (key: string, onSuccess: cb, onErr: cb) => unknown
	getTileUrl(map: eeMap, x: number, y: number, zoomLevel: number): URL
}

type eeGeometryConstructor = {
	Point(long: number, lat: number): eeGeometry
	Rectangle(...corners: [number, number, number, number]): eeGeometry
}
interface eeGeometry {}

type eeImageCollectionConstructor = {
	from(...im: eeImage[]): eeImageCollection
	(src: string): eeImageCollection
}

interface eeImageCollection {
	[x: string]: any;
	filter(eeFilterFunction: function): eeImageCollection
	map(f: function): eeImageCollection
	filterDate(start: string, end: string): eeImageCollection
	filterBounds(g: eeGeometry): eeImageCollection
	filterMetadata(key: string, comp: string, val: number): eeImageCollection
	limit(n: number, key: 'CLOUD_COVER' | string): eeImageCollection
	sort(key: string): eeImageCollection
	select(...bands: string[]): eeImageCollection
	mosaic(): any
	median(): eeImage
	mean(): eeImage
	merge(c: eeImageCollection): eeImageCollection
	first(): eeImage
	getInfo(f?: Function): string
}

type eeFilterConstructor = {
	bounds(g: eeGeometry): function
	and(...fs: function[]): function
	lt(k: string, v: number): function
	gt(k: string, v: number): function
	calendarRange(start: number, end: number, k: string): function
	dayOfYear(start: number, end: number): function
}

type eeImageConstructor = {
	(src: string): eeImage
	(coll: eeImageCollection | eeImage): eeImage
	cat(...img: eeImage[]): eeImage //https://developers.google.com/earth-engine/apidocs/ee-image-cat
	rgb(r: eeImage, g: eeImage, b: eeImage): eeImage
	constant(v: number | number[]): eeImage
}

export interface eeImage {
	getInfo(): string
	select(...bands: string[] | string[][]): eeImage
	round(): eeImage
	rgbToHsv(): eeImage
	hsvToRgb(): eeImage
	getMap(config?: {min?: number | number[], max?: number | number[], gamma?: number | number[], palette?: string[]}): eeMap
	getThumbURL(config: {min?: number, max?: number, dimensions?: number}): URL
	reduceRegion(...p: any[])
	bitwiseAnd(b: number): {eq: function}
	updateMask(m: unknown)
	multiply(img: eeImage | number): eeImage
	add(img: eeImage | number): eeImage
	mod(img: eeImage | number): eeImage
	divide(img: eeImage | number): eeImage
	log(): eeImage
	toShort(): eeImage
	toByte(): eeImage
	addBands(img: eeImage): eeImage
	copyProperties: function
	propertyNames(): string[]
}

export interface eeMap {}


export interface ee extends Iee {}
