import type {Iee} from "./eeTypes"

// @ts-ignore
declare module '@google/earthengine' {
	interface ee extends Iee {}
	export = ee
}