importScripts("compress.js");

//Returns an array, not an object.
onmessage = async function(message) {
	const opfsRoot = await navigator.storage.getDirectory();
	const fileHandle = await opfsRoot.getFileHandle('savedMarketData', {create: true});
	const syncAccessHandle = await fileHandle.createSyncAccessHandle();
	size = syncAccessHandle.getSize();
	const dataView = new DataView(new ArrayBuffer(size));
	syncAccessHandle.read(dataView);
	syncAccessHandle.close();
	const result = new TextDecoder().decode(dataView);
	if (result.length > 0) {
		let markets;
		try {
			markets = JSON.parse(gzipToText(result));
			//Used to be saved as an object, this can be removed later.
			if (!Array.isArray(markets)) {
				markets = Object.values(markets);
			}
		} catch (e) {
			console.error(e);
			markets = [];
		}
		postMessage(markets);
	} else {
		postMessage("no saved markets");
	}
}