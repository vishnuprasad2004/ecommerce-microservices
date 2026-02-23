
const CHARACTER_COUNT = 3;
const SEPARATOR = "-";

// SKU -> Stock Keeping Unit
// SKU Format: ITM-ATR1-ATR2 (if ATR2 exists)
export default function generateSKU(itemName:string, itemAttr1:string, itemAttr2?:string): string {
	let sku = itemName.substring(0, CHARACTER_COUNT).toUpperCase() + SEPARATOR +
		(itemAttr1.substring(0, CHARACTER_COUNT).toUpperCase()) + 
		(itemAttr2 ? SEPARATOR + itemAttr2.substring(0, CHARACTER_COUNT).toUpperCase() : "");

	return sku;

}

// simple validation to ensure SKU is generated correctly
export function isValidateSKU(sku: string): boolean {
	const regex = /^[A-Z]{3}-[A-Z]{3}(-[A-Z]{3})?$/;
	return regex.test(sku);
}
