importScripts("workerScripts.js");

let workingString = "";
let count = 0;
onmessage = function(message) {
	if (message.data === "all done") {
		postMessage("all done");
		return;
	}

	workingString += new TextDecoder().decode(message.data);

	const result = parseJsonArrayFromFrontOfString(workingString);

	if (typeof result === "object") {
		workingString = result.remainderOfInputString;

		for (let market of result.json) {
			addNormalizedFieldsToMarketData(market);
		}

		postMessage(result.json);
	}
}

const parseJsonArrayFromFrontOfString = function(string) {
	const startTime = performance.now()
	if (string.startsWith(",")) {
		string = string.slice(1);
	}
	if (string.startsWith(" ")) {
		string = string.slice(1);
	}
	if (!string.startsWith("[")) {
		string = "[" + string;
	}
	for (let i = string.length ; i > 0 ; i--) {
    if (string[i] === "}") {
			let result;
			const chunk = string.slice(0, i + 1);
			try {
				result = JSON.parse(chunk + "]");
				return {
					"json": result,
					"remainderOfInputString": string.slice(i + 1)
				};
			} catch (e) {
			}
		}
	}
	return "No valid JSON";
}