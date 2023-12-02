const marketLimit = 200;
const randomSeed = Math.floor(Math.random() * 20);
let verbose = false;

const currentSettingsToUrl = function() {
	let params = [];
	for (let entryField of Object.values(allSettingsData)) {
		if (entryField.currentValue !== entryField.defaultValue) {
			params.push(entryField.settingId + "=" +  encodeURIComponent(entryField.currentValue));
		}
	}
	let str = window.location.origin + window.location.pathname;
	return params.length > 0 ? str + "?" + params.join("&") : str;
}

const searchResultsTitleBar = document.getElementById("searchResultsTitleBar");

let visualProbability = false;
document.getElementById("visibilityOptions").addEventListener("input", function() {
	updateVisibilityOptions();
	uiControlFlow("visibilityChanged");
});

const tiebreakerComparisonFunction = function(result, a, b) {
	if (result !== 0) {
		return result;
	}
	if (a.normalizedQuestion === b.normalizedQuestion) {
		return 0;
	}
	if (a.normalizedQuestion > b.normalizedQuestion) {
		return 1;
	} else {
		return -1;
	}
}

//Polyfill for Chrome not supporting for await...of iteration of a ReadableStream, from https://bugs.chromium.org/p/chromium/issues/detail?id=929585
ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
  const reader = this.getReader()
  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) return
      yield value
    }
  }
  finally {
    reader.releaseLock()
  }
}

//The settingId, object key, and element ID in the HTML are all the same.
const allSettingsData = {
	"volumeWeight": {
		"type": "sortingWeight",
		"settingId": "volumeWeight",
		"humanReadableName": "Volume",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 1 : 999999999999;
			return function(a, b) {
				return tiebreakerComparisonFunction((b.hasOwnProperty("volume") ? b.volume : valueIfUndefined) - (a.hasOwnProperty("volume") ? a.volume : valueIfUndefined), a, b);
			}
		},
		"defaultValue": 0,
	},
	"volume24HoursWeight": {
		"type": "sortingWeight",
		"settingId": "volume24HoursWeight",
		"humanReadableName": "24 hour volume",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 1 : 999999999999;
			return function(a, b) {
				return tiebreakerComparisonFunction((b.hasOwnProperty("volume24Hours") ? b.volume24Hours : valueIfUndefined) - (a.hasOwnProperty("volume24Hours") ? a.volume24Hours : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 0,
	},
	"totalTradersWeight": {
		"type": "sortingWeight",
		"settingId": "totalTradersWeight",
		"humanReadableName": "Total traders",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 1 : 999999999999;
			return function(a, b) {
				return tiebreakerComparisonFunction((b.hasOwnProperty("totalTraders") ? b.totalTraders : valueIfUndefined) - (a.hasOwnProperty("totalTraders") ? a.totalTraders : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 0,
	},
	"liquidityWeight": {
		"type": "sortingWeight",
		"settingId": "liquidityWeight",
		"humanReadableName": "Liquidity",
		"currentValue": 1,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 1 : 999999999999;
			return function(a, b) {
				return tiebreakerComparisonFunction((b.hasOwnProperty("liquidity") ? b.liquidity : valueIfUndefined) - (a.hasOwnProperty("liquidity") ? a.liquidity : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 1,
	},
	"closeTimeWeight": {
		"type": "sortingWeight",
		"settingId": "closeTimeWeight",
		"humanReadableName": "Close time",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 8640000000000000 : -8640000000000000;
			return function(a, b) {
				return tiebreakerComparisonFunction((a.hasOwnProperty("closeTime") ? a.closeTime : valueIfUndefined) - (b.hasOwnProperty("closeTime") ? b.closeTime : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 0,
	},
	"createdTimeWeight": {
		"type": "sortingWeight",
		"settingId": "createdTimeWeight",
		"humanReadableName": "Created time",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? -8640000000000000 : 8640000000000000;
			return function(a, b) {
				return tiebreakerComparisonFunction((b.hasOwnProperty("createdTime") ? b.createdTime : valueIfUndefined) - (a.hasOwnProperty("createdTime") ? a.createdTime : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 0,
	},
	"creatorWeight": {
		"type": "sortingWeight",
		"settingId": "creatorWeight",
		"humanReadableName": "Creator",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			return function(a, b) {
				let result = 0;
				if (a.creatorUsername > b.creatorUsername) {
					result = 1;
				}
				if (a.creatorUsername < b.creatorUsername) {
					result = -1;
				}
				return tiebreakerComparisonFunction(result, a, b);
			};
		},
		"defaultValue": 0,
	},
	"probabilityWeight": {
		"type": "sortingWeight",
		"settingId": "probabilityWeight",
		"humanReadableName": "Probability",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 0 : 0.5;
			return function(a, b) {
				const aEffectiveProb = a.hasOwnProperty("probability") ? a.probability : valueIfUndefined;
				const bEffectiveProb = b.hasOwnProperty("probability") ? b.probability : valueIfUndefined;
				return tiebreakerComparisonFunction(Math.abs(0.5 - aEffectiveProb) - Math.abs(0.5 - bEffectiveProb), a, b);
			};
		},
		"defaultValue": 0,
	},
	"numGroupsWeight": {
		"type": "sortingWeight",
		"settingId": "numGroupsWeight",
		"humanReadableName": "Number of groups",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			return function(a, b) {
				return tiebreakerComparisonFunction(a.groups.length - b.groups.length, a, b);
			};
		},
		"defaultValue": 0,
	},
	"randomWeight": {
		"type": "sortingWeight",
		"settingId": "randomWeight",
		"humanReadableName": "Random",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			return function(a, b) {
				const aValue = a.id.slice(randomSeed) + a.id.slice(0, randomSeed);
				const bValue = b.id.slice(randomSeed) + b.id.slice(0, randomSeed);
				if (aValue > bValue) {
					return 1;
				}
				if (aValue === bValue) {
					return 0;
				}
				return -1;
			}
		},
		"defaultValue": 0,
	},
	"lastUpdatedTimeWeight": {
		"type": "sortingWeight",
		"settingId": "lastUpdatedTimeWeight",
		"humanReadableName": "Last updated",
		"currentValue": 0,
		"comparisonFunctionMaker": function(weight) {
			const valueIfUndefined = weight > 0 ? 8640000000000000 : -8640000000000000;
			return function(a, b) {
				return tiebreakerComparisonFunction((a.hasOwnProperty("lastUpdatedTime") ? a.lastUpdatedTime : valueIfUndefined) - (b.hasOwnProperty("lastUpdatedTime") ? b.lastUpdatedTime : valueIfUndefined), a, b);
			};
		},
		"defaultValue": 0,
	},
	"questionVisibility": {
		"type": "visibilityOption",
		"settingId": "questionVisibility",
		"humanReadableName": "Question",
		"currentValue": true,
		"defaultValue": true,
	},
	"descriptionVisibility": {
		"type": "visibilityOption",
		"settingId": "descriptionVisibility",
		"humanReadableName": "Description",
		"columnWidth": 40,
		"currentValue": false,
		"defaultValue": false,
	},
	"groupsVisibility": {
		"type": "visibilityOption",
		"settingId": "groupsVisibility",
		"humanReadableName": "Groups",
		"columnWidth": 15,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "numGroupsWeight",
	},
	"creatorVisibility": {
		"type": "visibilityOption",
		"settingId": "creatorVisibility",
		"humanReadableName": "Creator",
		"columnWidth": 8,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "creatorWeight",
	},
	"closeTimeVisibility": {
		"type": "visibilityOption",
		"settingId": "closeTimeVisibility",
		"humanReadableName": "Close time",
		"columnWidth": 6.8,
		"currentValue": true,
		"defaultValue": true,
		"associatedSortingWeight": "closeTimeWeight",
	},
	"liquidityVisibility": {
		"type": "visibilityOption",
		"settingId": "liquidityVisibility",
		"humanReadableName": "Liquidity",
		"columnWidth": 4,
		"currentValue": true,
		"defaultValue": true,
		"associatedSortingWeight": "liquidityWeight",
	},
	"volumeVisibility": {
		"type": "visibilityOption",
		"settingId": "volumeVisibility",
		"humanReadableName": "Volume",
		"columnWidth": 5,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "volumeWeight",
	},
	"volume24HoursVisibility": {
		"type": "visibilityOption",
		"settingId": "volume24HoursVisibility",
		"humanReadableName": "24 hour volume",
		"columnWidth": 4,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "volume24HoursWeight",
	},
	"totalTradersVisibility": {
		"type": "visibilityOption",
		"settingId": "totalTradersVisibility",
		"humanReadableName": "Total traders",
		"columnWidth": 3,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "totalTradersWeight",
	},
	"lastUpdatedTimeVisibility": {
		"type": "visibilityOption",
		"settingId": "lastUpdatedTimeVisibility",
		"humanReadableName": "Last updated",
		"columnWidth": 6.5,
		"currentValue": false,
		"defaultValue": false,
		"associatedSortingWeight": "lastUpdatedTimeWeight",
	},
	"percentageVisibility": {
		"type": "visibilityOption",
		"settingId": "percentageVisibility",
		"humanReadableName": "Prob",
		"columnWidth": 3,
		"currentValue": true,
		"defaultValue": true,
		"associatedSortingWeight": "probabilityWeight",
	},
	"dashboardVisibility": {
		"type": "visibilityOption",
		"settingId": "dashboardVisibility",
		"humanReadableName": "Dash",
		"columnWidth": 5,
		"currentValue": false,
		"defaultValue": false,
	},
	"bettingVisibility": {
		"type": "visibilityOption",
		"settingId": "bettingVisibility",
		"humanReadableName": "Betting",
		"columnWidth": 17,
		"currentValue": false,
		"defaultValue": false,
	},
	"question": {
		"type": "searchOption",
		"settingId": "question",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "question",
	},
	"description": {
		"type": "searchOption",
		"settingId": "description",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "description",
	},
	"groups": {
		"type": "searchOption",
		"settingId": "groups",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "groups",
	},
	"type": {
		"type": "searchOption",
		"settingId": "type",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "type",
	},
	"answers": {
		"type": "searchOption",
		"settingId": "answers",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "answers",
	},
	"any": {
		"type": "searchOption",
		"settingId": "any",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
	},
	"creator": {
		"type": "searchOption",
		"settingId": "creator",
		"inputFormat": "text",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "creatorUsername",
	},
	"open": {
		"type": "searchOption",
		"settingId": "open",
		"inputFormat": "checkbox",
		"currentValue": true,
		"defaultValue": true,
	},
	"closed": {
		"type": "searchOption",
		"settingId": "closed",
		"inputFormat": "checkbox",
		"currentValue": false,
		"defaultValue": false,
	},
	"resolved": {
		"type": "searchOption",
		"settingId": "resolved",
		"inputFormat": "checkbox",
		"currentValue": false,
		"defaultValue": false,
	},
	"closeTime": {
		"type": "searchOption",
		"settingId": "closeTime",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "closeTime",
	},
	"createdTime": {
		"type": "searchOption",
		"settingId": "createdTime",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "createdTime",
	},
	"percentage": {
		"type": "searchOption",
		"settingId": "percentage",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
	},
	"liquidity": {
		"type": "searchOption",
		"settingId": "liquidity",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "liquidity",
	},
	"volume": {
		"type": "searchOption",
		"settingId": "volume",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "volume",
	},
	"volume24Hours": {
		"type": "searchOption",
		"settingId": "volume24Hours",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "volume24Hours",
	},
	"totalTraders": {
		"type": "searchOption",
		"settingId": "totalTraders",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "totalTraders",
	},
	"numGroups": {
		"type": "searchOption",
		"settingId": "numGroups",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
	},
	"lastUpdatedTime": {
		"type": "searchOption",
		"settingId": "lastUpdatedTime",
		"inputFormat": "numericalRange",
		"currentValue": "",
		"defaultValue": "",
		"marketProperty": "lastUpdatedTime",
	},
	"custom": {
		"type": "searchOption",
		"settingId": "custom",
		"inputFormat": "code",
		"currentValue": "",
		"defaultValue": "",
	},
	"dashboardCheckbox": {
		"type": "searchOption",
		"settingId": "dashboardCheckbox",
		"inputFormat": "checkbox",
		"currentValue": false,
		"defaultValue": false,
	},
}

//Stores a reference to each market object sorted by the relevant sorting function assuming a weight of 1 and one assuming a weight of -1.
const presortedArrays = {};
for (let setting of Object.values(allSettingsData)) {
	if (setting.type === "sortingWeight") {
		presortedArrays[setting.settingId] = {
			"positive": {
				"array": [],
				"pendingItems": [],
			},
			"negative": {
				"array": [],
				"pendingItems": [],
			},
		};
	}
};

const insertMultipleItemsIntoSortedArray = function(items, array, comparitorFunction) {
	const sortedCopy = items.toSorted(comparitorFunction);
	const tempArray = [];
	while (array.length > 0 || sortedCopy.length > 0) {
		if (sortedCopy.length === 0) {
			tempArray.push(array.pop());
		} else if (array.length === 0) {
			tempArray.push(sortedCopy.pop());
		} else if (comparitorFunction(array[array.length - 1], sortedCopy[sortedCopy.length - 1]) < 0) {
			tempArray.push(sortedCopy.pop());
		} else {
			tempArray.push(array.pop());
		}
	}
	while (tempArray.length > 0) {
		array.push(tempArray.pop());
	}
}

const removeMarketsWithSameIdFromPresortedArrays = function(array, marketsToRemove) {
	for (let market of marketsToRemove) {
		for (let i in array) {
			if (market.id === array[i].id) {
				array.splice(i, 1);
				break;
			}
		}
	}
}

const insertIntoPresortedArrays = function(marketsToInsert, marketsToResort) {

	const sortingWeights = Object.values(allSettingsData).filter(setting => setting.type === "sortingWeight");

	for (let weight of sortingWeights) {
		if (weight.currentValue !== 0) {//We only presort ones that are in use. If the sorting weights change, mixedSort calls this again with the new weights.
			const presortedArrayObj = presortedArrays[weight.settingId];

			for (let sign of ["positive", "negative"]) {
				removeMarketsWithSameIdFromPresortedArrays(presortedArrayObj[sign].array, marketsToResort);

				const totalMarkets = marketsToInsert.concat(presortedArrayObj[sign].pendingItems).concat(marketsToResort);

				presortedArrayObj[sign].pendingItems = [];

				insertMultipleItemsIntoSortedArray(totalMarkets, presortedArrayObj[sign].array, weight.comparisonFunctionMaker(sign === "positive" ? 1 : -1));
			}
		} else {
			presortedArrays[weight.settingId].positive.pendingItems.push(...marketsToInsert);
			presortedArrays[weight.settingId].negative.pendingItems.push(...marketsToInsert);
		}
	}
}

const updateSortingOptionValues = function() {
	const allSortingWeights = Object.values(allSettingsData).filter(field => field.type === "sortingWeight");
	for (let weight of allSortingWeights) {
		weight.currentValue = Number(document.getElementById(weight.settingId).value);
	}
};

//Weights is an object like {weightname: value}. Any that are not defined are set to 0.
const updateSortingOptionDisplay = function(weightObj) {
	const allSortingWeights = Object.values(allSettingsData).filter(field => field.type === "sortingWeight");
	let numArgsThatAre1 = 0;
	let argToUse = allSortingWeights.filter(weight => weight.defaultValue === 1)[0];
	for (let weight of allSortingWeights) {
		if (typeof weightObj[weight.settingId] === "number" && !Number.isNaN(weightObj[weight.settingId])) {
			weight.currentValue = weightObj[weight.settingId];
		} else {
			weight.currentValue = 0;
		}
		document.getElementById(weight.settingId).value = weight.currentValue;
		if (weight.currentValue === 1) {
			numArgsThatAre1++;
			argToUse = weight.settingId;
		}
	}
	if (numArgsThatAre1 === 1) {
		document.getElementById("sortOrder").value = allSettingsData[argToUse].humanReadableName;
		document.getElementById("mixingWeights").style.visibility = "hidden";
	} else {
		document.getElementById("sortOrder").value = "Mixed";
		document.getElementById("mixingWeights").style.visibility = "visible";
	}
}

let allMarketData = {},//Also stores a reference to a row element.
		allMarketArray = [],//This is Object.values(allMarketData), kept up to date any time allMarketData changes. Saves ~25ms on every search.
		currentMarketArray = [];//This is allMarketArray filtered down to the markets the user is currently looking at. (Includes markets over the display limit.)

let allMarketsSorted = true;

const pendingMarketsToAdd = [];
const addMarkets = async function() {
	while (true) {
		if (pendingMarketsToAdd.length > 0) {
			const markets = pendingMarketsToAdd.splice(0, 500);
			uiControlFlow("marketsChanged", markets);
		}
		await sleep(30);
	}
}

const convertInputMarketsToMarketsToDoStuffWith = function(markets) {
	markets = markets.filter(function(market) {
		return market.hasOwnProperty("type") && market.hasOwnProperty("lastUpdatedTime") && !market.hasOwnProperty("isResolved") && market.type !== "bugged";
	});
	if (markets.length > 1 && !markets[0].normalizedQuestion) {
		throw new Error("Markets not normalized.");
	}
	const uniqueMarkets = {};
	for (let market of markets) {
		if (!uniqueMarkets[market.id] || uniqueMarkets[market.id].lastUpdatedTime < market.lastUpdatedTime) {
			uniqueMarkets[market.id] = market;
		}
	}
	const newMarketsToAdd = [];
	const existingMarketsToEdit = [];
	for (let id in uniqueMarkets) {
		const market = uniqueMarkets[id];
		if (allMarketData[market.id] === undefined) {
			newMarketsToAdd.push(market);
		} else if (market.lastUpdatedTime > allMarketData[market.id].lastUpdatedTime) {
			existingMarketsToEdit.push(market);
		}
	}
	return {
		"newMarketsToAdd": newMarketsToAdd,
		"existingMarketsToEdit": existingMarketsToEdit,
	};
}

//This function handles all modification of the results table, and all modification of allMarketData, allMarketArray, and currentMarketArray.
const uiControlFlow = function(mode, markets) {
	const startTime = performance.now();
	if (!["marketsChanged", "filtersChanged", "sortingChanged", "visibilityChanged"].includes(mode)) {
		throw new Error(`${mode} is not a valid control flow mode`);
	}

	if (mode === "marketsChanged") {
		const result = convertInputMarketsToMarketsToDoStuffWith(markets);
		const newMarketsToAdd = result.newMarketsToAdd;
		const existingMarketsToEdit = result.existingMarketsToEdit;

		for (let newMarket of newMarketsToAdd) {
			allMarketData[newMarket.id] = newMarket;
			allMarketArray.push(newMarket);
		}
		for (let changedMarket of existingMarketsToEdit) {
			changedMarket.elementRef = allMarketData[changedMarket.id].elementRef;
			allMarketData[changedMarket.id] = changedMarket;
			if (changedMarket.elementRef) {
				updateRow(changedMarket.elementRef, changedMarket);
			}
		}
		if (verbose) {console.log(performance.now() - startTime);}
		insertIntoPresortedArrays(newMarketsToAdd, existingMarketsToEdit);
		if (markets.length > 0) {
			if (verbose) {console.log(performance.now() - startTime);}
			mixedSort(allMarketArray);
			allMarketsSorted = true;
			if (verbose) {console.log(performance.now() - startTime);}
			filterMarkets();
			if (lucky && currentMarketArray.length > 0) {
				window.location.href = marketUrl(currentMarketArray[0]);
			} else {
				if (verbose) {console.log(performance.now() - startTime);}
				displayRows();
			}
		}
	}
	if (mode === "visibilityChanged") {
		updateCssForTableVisibility();
		for (let i = 0 ; i < currentMarketArray.length ; i++) {
			if (i >= marketLimit) {
				break;
			}
			const market = currentMarketArray[i];
			if (visualProbability) {
				if (market.probability) {
					market.elementRef.style.background = `linear-gradient(90deg, lightgreen ${Math.round(market.probability * 100)}%, lightpink 0)`;
				} else {
					market.elementRef.style.background = "lightgrey";
				}
			} else {
				market.elementRef.style.background = "";
			}
		}
	} else if (mode === "sortingChanged") {
		allMarketsSorted = false;
		mixedSort(currentMarketArray);
		displayRows();
	} else if (mode === "filtersChanged") {
		if (!allMarketsSorted) {
			mixedSort(allMarketArray);
			allMarketsSorted = true;
		}
		filterMarkets();
		displayRows();
	}

	history.replaceState({}, "", currentSettingsToUrl());

	if (verbose) {
		console.log(`In total, control flow took ${performance.now() - startTime}ms`);
	}
	const postControlFlowTime = performance.now();
	setTimeout(function() {
		//I think this is mostly the garbage collector.
		//console.log("Post-control-flow microtasks took " + (performance.now() - postControlFlowTime) + "ms");
	}, 0);
}

const updateCssForTableVisibility = function() {
	let styleString = "";
	for (let entryField of Object.values(allSettingsData)) {
		if (entryField.type === "visibilityOption") {
			if (!entryField.currentValue) {
				styleString += `.${entryField.settingId} {display:none}`;
			}
		}
	}

	styleString += ".row {grid-template-columns: ";
	for (let value in allSettingsData) {
		if (value === "questionVisibility") {
			styleString += "1fr ";
		} else if (allSettingsData[value].type === "visibilityOption" && allSettingsData[value].currentValue) {
			styleString += allSettingsData[value].columnWidth + "rem ";
		}
	}
	styleString += "}";

	const styles = document.getElementById("jsStyles");
	styles.innerHTML = styleString;
}
updateCssForTableVisibility();

const updateVisibilityOptions = function() {
	visualProbability = document.getElementById("probabilityColor").checked;

	for (let entryField of Object.values(allSettingsData)) {
		if (entryField.type === "visibilityOption") {
			entryField.currentValue = document.getElementById(entryField.settingId).checked;
		}
	}
	allSettingsData.dashboardVisibility.currentValue ? document.getElementById("dashboardLabel").style.display = "inline" : document.getElementById("dashboardLabel").style.display = "none";
	allSettingsData.bettingVisibility.currentValue ? document.getElementById("apiKeyLabel").style.display = "inline" : document.getElementById("apiKeyLabel").style.display = "none";
}

let dashboard = [];//List of market IDs.
		dashboardOn = false;
if (localStorage.getItem("marketDashboard")) {
	dashboard = JSON.parse(localStorage.getItem("marketDashboard"));
}
document.getElementById("dashboardCheckbox").addEventListener("change", function() {
	dashboardOn = document.getElementById("dashboardCheckbox").checked;
	uiControlFlow("filtersChanged");
});

if (localStorage.getItem("manifoldApiKey")) {
	document.getElementById("apiKey").value = localStorage.getItem("manifoldApiKey");
}
document.getElementById("apiKey").addEventListener("change", function() {
	localStorage.setItem("manifoldApiKey", document.getElementById("apiKey").value);
})

const marketUrl = function(market) {
	if (market.slug && market.creatorUsername) {
		return `https://manifold.markets/${market.creatorUsername}/${market.slug}?r=SXNhYWNLaW5n`;
	} else {
		return market.url;
	}
}

const allGroups = new Set();
const allCreators = new Set();
const allTypes = new Set();
const createDatalists = function() {
	const oldGroupsSize = allGroups.size;
	const oldCreatorsSize = allCreators.size;
	const oldTypesSize = allTypes.size;

	for (let id in allMarketData) {
		for (let group of allMarketData[id].groups) {
			allGroups.add(group);
		}
		allCreators.add(allMarketData[id].creatorUsername);
		if (allMarketData[id].type) {
			allTypes.add(allMarketData[id].type);
		}
	}

	if (oldGroupsSize !== allGroups.size) {
		let groupOptions = "";
		const sortedGroups = Array.from(allGroups).sort();
		for (let group of sortedGroups) {
			groupOptions += "<option value=\"" + group + "\" />";
		}
		document.getElementById("groupsDatalist").innerHTML = groupOptions;
	}

	if (oldCreatorsSize !== allCreators.size) {
		let creatorOptions = "";
		const sortedCreators = Array.from(allCreators).sort();
		for (let creator of sortedCreators) {
			creatorOptions += "<option value=\"" + creator + "\" />";
		}
		document.getElementById("creatorDatalist").innerHTML = creatorOptions;
	}

	if (oldTypesSize !== allTypes.size) {
		let typeOptions = "";
		const sortedTypes = Array.from(allTypes).sort();
		for (let type of sortedTypes) {
			typeOptions += "<option value=\"" + type + "\" />";
		}
		document.getElementById("typeDatalist").innerHTML = typeOptions;
	}
}

const mixedSort = function(markets) {
	const nonZeroSortingWeights = Object.values(allSettingsData).filter(setting => setting.type === "sortingWeight" && setting.currentValue !== 0);

	let firstArray = true;
	for (weight of nonZeroSortingWeights) {
		const sign = weight.currentValue > 0 ? "positive" : "negative";
		const presortedArray = presortedArrays[weight.settingId][sign].array;

		if (presortedArray.length !== allMarketArray.length) {
			insertIntoPresortedArrays([], []);
		}

		for (let i in presortedArray) {
			if (firstArray) {//It's much faster to leave the markets with this property and reset it as part of this loop than to make additional loops to wipe and reset it.
				presortedArray[i].totalSortingWeightIndex = i * weight.currentValue;
			} else {
				presortedArray[i].totalSortingWeightIndex += i * weight.currentValue;
			}
		}
		firstArray = false;
	}

	markets.sort(function(a, b) {
		return a.totalSortingWeightIndex - b.totalSortingWeightIndex;
	});
}

const filterMarkets = function() {
	if (dashboardOn) {
		const marketIds = Object.keys(allMarketData);
		const dashboardMarkets = [];
		for (let id of marketIds) {
			if (dashboard.includes(id)) {
				dashboardMarkets.push(allMarketData[id]);
			}
		}
		return;
	}

	let markets = Array.from(allMarketArray);

	//We parse the inputs into objects for the search functions.
	const searchTerms = {};
	for (let entryField of Object.values(allSettingsData)) {
		if (entryField.type === "searchOption") {
			if (entryField.inputFormat === "text") {
				entryField.currentValue = document.getElementById(entryField.settingId).value;

				const elementTerms = searchTerms[entryField.settingId] = [];
				const result = extractQuotedSubstrings(entryField.currentValue);
				elementTerms.push(...result.quotedSubstrings.map(match => ({"type": "exact", "negated": match.negated, "string": match.string})));
				//Without the filter it'll search each field to make sure it matches the empty string from an empty input, which was very laggy.
				const words = result.remainingString.split(" ").filter(str => str.length > 0);
				elementTerms.push(...words.map(string => ({"type": "normalized", "negated": string.startsWith("-"), "string": normalizeString(string)})));
			} else if (entryField.inputFormat === "numericalRange") {
				entryField.currentValue = document.getElementById(entryField.settingId).value;
				const ranges = parseRangesFromNumberInput(entryField.currentValue, ["closeTime", "createdTime"].includes(entryField.settingId));
				const elementTerms = searchTerms[entryField.settingId] = [];
				for (let i in ranges) {
					ranges[i].min = parseTypeOfNumericalInput(ranges[i].min, "min", entryField.settingId);
					ranges[i].max = parseTypeOfNumericalInput(ranges[i].max, "max", entryField.settingId);
					if (ranges[i].max < ranges[i].min) {
						throw new Error(`Invalid numerical entry for ${entryField.settingId}; max less than min`);
					}
				}
				elementTerms.push(...ranges);
			} else if (entryField.inputFormat === "checkbox") {
				entryField.currentValue = document.getElementById(entryField.settingId).checked;

				searchTerms[entryField.settingId] = entryField.currentValue;
			} else if (entryField.inputFormat === "code") {
				entryField.currentValue = document.getElementById(entryField.settingId).value;

				searchTerms[entryField.settingId] = entryField.currentValue;
			}
		}
	}

	if (!searchTerms.open) {
		markets = markets.filter(market => market.hasOwnProperty("closeTime") && market.closeTime < Date.now());
	}
	if (!searchTerms.closed) {
		markets = markets.filter(market => !market.hasOwnProperty("closeTime") || market.closeTime > Date.now() || market.resolution !== null);
	}
	if (!searchTerms.resolved) {
		markets = markets.filter(market => market.resolution === null);
	}

	const numericFilters = Object.values(allSettingsData).filter(setting => setting.type === "searchOption" && setting.inputFormat === "numericalRange").map(filter => filter.settingId);
	for (let settingId of numericFilters) {
		if (searchTerms[settingId] && searchTerms[settingId].length > 0) {
			if (settingId === "numGroups") {
				markets = markets.filter(function(market) {
					for (let numGroupsSearchTerm of searchTerms.numGroups) {
						if (market.groups.length >= numGroupsSearchTerm.min && market.groups.length <= numGroupsSearchTerm.max) {
							return true;
						}
					}
					return false;
				});
			} else {
				let settingName = settingId;
				if (settingId === "percentage") {
					settingName = "probability";
				}

				markets = markets.filter(function(market) {
					if (!market.hasOwnProperty(settingName)) {
						return false;//Some markets don't have a close time or percentage, and those shouldn't show up in searches for those qualities.
					}
					for (let range of searchTerms[settingId]) {
						if (market[settingName] >= range.min && market[settingName] <= range.max) {
							return true;
						}
					}
					return false;
				});
			}
		}
	}

	const textSearchFieldSettings = Object.values(allSettingsData).filter(setting => setting.type === "searchOption" && setting.inputFormat === "text" && setting.marketProperty);
	for (let setting of textSearchFieldSettings) {
		for (let term of searchTerms[setting.settingId]) {
			if (typeof allMarketArray[0][setting.marketProperty] === "string") {
				//Most fields are just a single string on the market.
				if (term.type === "exact") {
					markets = markets.filter(market => market[setting.marketProperty].includes(term.string) === !term.negated);
				} else if (term.type === "normalized") {
					const normalizedPropName = "normalized" + setting.marketProperty[0].toUpperCase() + setting.marketProperty.slice(1);
					markets = markets.filter(market => (market[normalizedPropName] || normalizeString(market[setting.marketProperty])).includes(term.string) === !term.negated);
				}
			} else {
				//Groups and answers, which are arrays.
				if (term.type === "exact") {
					markets = markets.filter(function(market) {
						return market[setting.marketProperty].some(item => item.includes(term.string)) === !term.negated;
					});
				} else if (term.type === "normalized") {
					const normalizedPropName = "normalized" + setting.marketProperty[0].toUpperCase() + setting.marketProperty.slice(1);
					markets = markets.filter(function(market) {
						if (market.hasOwnProperty(normalizedPropName)) {
							return market[normalizedPropName].some(item => item.includes(term.string)) === !term.negated;
						} else {
							return market[setting.marketProperty].some(item => normalizeString(item).includes(term.string)) === !term.negated;
						}
					});
				}
			}
		}
	}

	for (let term of searchTerms.any) {
		if (term.type === "exact") {
			markets = markets.filter(function(market) {
				if (market.question.includes(term.string) === !term.negated) {
					return true;
				}
				if (market.description.includes(term.string) === !term.negated) {
					return true;
				}
				if (market.answers.some(answer => answer.includes(term.string)) === !term.negated) {
					return true;
				}
				return false;
			});
		} else if (term.type === "normalized") {
			markets = markets.filter(function(market) {
				if (market.normalizedQuestion.includes(term.string) === !term.negated) {
					return true;
				}
				if (market.normalizedDescription.includes(term.string) === !term.negated) {
					return true;
				}
				if (market.normalizedAnswers.some(answer => answer.includes(term.string) === !term.negated)) {
					return true;
				}
				return false;
			});
		}
	}

	if (searchTerms.custom) {
		//It's much faster to only have a single eval call.
		let customFuction;
		let errored = false;
		try {
			customFuction = eval(`(function(market) {return ${searchTerms.custom}})`);
		} catch (e) {
			console.error(`Error parsing script. Message: "${e.message}"`);
			errored = true;
		}
		if (!errored) {
			markets = markets.filter(function(market) {
				try {
					if (errored) {
						return false;
					}
					return customFuction(market);
				} catch (e) {
					console.error(`Error evaluating script. Message: "${e.message}" Market object follows:`);
					console.log(market);
					errored = true;
					return false;
				}
			});
		}
	}

	currentMarketArray = markets;
}

let numDots = 0;
const loadingInterval = setInterval(function() {
	document.getElementById("loadingIndicator").textContent = `Loading markets${".".repeat(numDots)}`;
	numDots++;
	if (numDots > 3) {
		numDots = 0;
	}
	if ((allRemoteMarketsLoaded || allLocalMarketsLoaded) && pendingMarketsToAdd.length === 0) {
		document.getElementById("loadingIndicator").style.display = "none";
		clearInterval(loadingInterval);
	}
}, 200)

const searchFruits = ["Caring kumquat", "Sassy strawberry", "Mysterious mango", "Embarrassed eggplant"];
const preloadedImages = [];
for (let fruit of searchFruits) {
	const image = new Image();
	image.src = `${fruit.toLowerCase().replace(" ", "-")}.png`;
	document.body.appendChild(image);
	image.style.display = "none";
	preloadedImages.push(image)
}

let lastRenderHadNoMarkets = false;
const displayRows = function() {
	const startTime = performance.now();

	if (lastRenderHadNoMarkets && currentMarketArray.length === 0) {
		//console.log("Rendering took " + (performance.now() - startTime) + "ms");
		return;
	}
	lastRenderHadNoMarkets = currentMarketArray.length === 0;

	const searchResults = document.getElementById("searchResults");
	searchResults.innerHTML = "";

	if (currentMarketArray.length === 0 && !dashboardOn) {
		searchResultsTitleBar.style.display = "none";
		const fruit = searchFruits[Math.floor(Math.random() * searchFruits.length)];
		document.getElementById("numResults").textContent = `0 results. ${fruit} is here for you.`;
		searchResults.innerHTML = `<img id="searchFruit" src="${fruit.toLowerCase().replace(" ", "-")}.png">`;
		//console.log("Rendering took " + (performance.now() - startTime) + "ms");
		return;
	} else {
		searchResultsTitleBar.style.display = "";
	}

	document.getElementById("numResults").textContent = "";
	if (currentMarketArray.length <= marketLimit) {
		document.getElementById("numResults").textContent += `${currentMarketArray.length} results:`;
	} else {
		document.getElementById("numResults").textContent += `${currentMarketArray.length} results (displaying ${marketLimit}):`;
	}

	for (let i in currentMarketArray) {
		if (i < marketLimit) {
			if (!currentMarketArray[i].elementRef) {
				createRow(currentMarketArray[i]);
			}
			searchResults.appendChild(currentMarketArray[i].elementRef);
		} else {
			break;
		}
	}

	//console.log("Rendering took " + (performance.now() - startTime) + "ms");
}

//Add rows for markets in the background to make future renders faster.
setInterval(function() {
	const startTime = performance.now();
	for (let i in allMarketArray) {
		if (!allMarketArray[i].elementRef) {
			createRow(allMarketArray[i]);
		}
		if (performance.now() - startTime > 20) {
			break;
		}
	}
}, 100);

let lastFreeTime = performance.now();
setInterval(function() {
	lastFreeTime = performance.now();
}, 5);

const createRow = function(market) {
	const row = document.createElement("span");
	row.classList.add("row");
	row.setAttribute("id", market.id);

	const question = document.createElement("a");
	question.classList.add("questionVisibility");
	row.appendChild(question);

	const description = document.createElement("p");
	description.classList.add("descriptionVisibility");
	row.appendChild(description);

	const groupsList = document.createElement("p");
	groupsList.classList.add("groupsVisibility");
	row.appendChild(groupsList);

	const creator = document.createElement("p");
	creator.classList.add("clickable", "fancyOval", "creatorVisibility");
	creator.addEventListener("click", function() {
		document.getElementById("creator").value = market.creatorUsername;
		uiControlFlow("filtersChanged");
	});
	row.appendChild(creator);

	const closeTime = document.createElement("p");
	closeTime.classList.add("closeTimeVisibility");
	row.appendChild(closeTime);

	const liquidity = document.createElement("p");
	liquidity.classList.add("rightAlign", "liquidityVisibility");
	row.appendChild(liquidity);

	const volume = document.createElement("p");
	volume.classList.add("rightAlign", "volumeVisibility");
	row.appendChild(volume);

	const volume24Hours = document.createElement("p");
	volume24Hours.classList.add("rightAlign", "volume24HoursVisibility");
	row.appendChild(volume24Hours);

	const totalTraders = document.createElement("p");
	totalTraders.classList.add("rightAlign", "totalTradersVisibility");
	row.appendChild(totalTraders);

	const lastUpdate = document.createElement("p");
	lastUpdate.classList.add("lastUpdatedTimeVisibility");
	row.appendChild(lastUpdate);

	const percentage = document.createElement("p");
	percentage.classList.add("rightAlign", "percentageVisibility");
	row.appendChild(percentage);

	const dashboardButton = document.createElement("button");
	dashboardButton.classList.add("searchButton", "dashboardVisibility");
	dashboardButton.textContent = dashboard.includes(market.id) ? "Remove" : "Add";
	dashboardButton.addEventListener("click", function() {
		if (dashboardOn) {
			dashboard.splice(dashboard.indexOf(market.id), 1);
			dashboardButton.parentElement.parentElement.removeChild(dashboardButton.parentElement);
		} else {
			if (dashboardButton.textContent === "Add") {
				dashboard.push(market.id);
				localStorage.setItem("marketDashboard", JSON.stringify(dashboard));
				dashboardButton.textContent = "Remove";
			} else {
				dashboard.splice(dashboard.indexOf(market.id), 1);
				dashboardButton.textContent = "Add";
			}
		}
	});
	row.appendChild(dashboardButton);

	const betting = document.createElement("div");
	betting.classList.add("bettingVisibility");
	const bettingMax = document.createElement("input");
	bettingMax.classList.add("bettingMax");
	bettingMax.setAttribute("type", "number");
	bettingMax.setAttribute("min", "1");
	bettingMax.setAttribute("max", "999999");
	bettingMax.setAttribute("integral", "true");
	const bettingPercentage = document.createElement("input");
	bettingPercentage.setAttribute("type", "number");
	bettingPercentage.setAttribute("min", "0");
	bettingPercentage.setAttribute("max", "100");
	const bet = document.createElement("button");
	bet.classList.add("searchButton");
	bet.textContent = "Bet";
	bet.addEventListener("click", async function() {
		//We don't pass in the market because it could change after the handler was created.
		placeBet(market.id, bettingPercentage, bettingMax);
	});
	bettingPercentage.addEventListener("keypress", async function(e) {
		if (e.key === "Enter") {
			placeBet(market.id, bettingPercentage, bettingMax);
		}
	});
	bettingMax.addEventListener("keypress", async function(e) {
		if (e.key === "Enter") {
			placeBet(market.id, bettingPercentage, bettingMax);
		}
	});
	const maxLabel = document.createElement("label");
	maxLabel.textContent = " Mana: ";
	const probLabel = document.createElement("label");
	probLabel.textContent = "%: ";
	probLabel.appendChild(bettingPercentage);
	maxLabel.appendChild(bettingMax);
	betting.appendChild(probLabel);
	betting.appendChild(maxLabel);
	betting.appendChild(bet);
	row.appendChild(betting);

	updateRow(row, market);

	market.elementRef = row;
}

const updateRelativeTimeDisplays = function(ms) {
	for (let market of currentMarketArray) {
		if (!market.elementRef) {
			continue;
		}
		if (market.hasOwnProperty("closeTime") && market.closeTime - Date.now() <= ms) {
			let string = formatDateDistance(market.closeTime);
			market.elementRef.querySelector(".closeTimeVisibility").textContent = string[0].toUpperCase() + string.slice(1);
		}
		if (market.hasOwnProperty("lastUpdatedTime") && Date.now() - market.lastUpdatedTime <= ms) {
			let string = formatDateDistance(market.lastUpdatedTime);
			market.elementRef.querySelector(".lastUpdatedTimeVisibility").textContent = string[0].toUpperCase() + string.slice(1);
		}
	}
}
setInterval(function() {updateRelativeTimeDisplays(60000)}, 1000);
setInterval(function() {updateRelativeTimeDisplays(3600000)}, 60000);

const updateRow = function(row, market) {
	const question = row.querySelector(".questionVisibility");
	question.textContent = market.question;
	question.setAttribute("href", marketUrl(market));

	const description = row.querySelector(".descriptionVisibility");
	description.textContent = market.description;

	const groupsList = row.querySelector(".groupsVisibility");
	groupsList.innerHTML = "";
	for (let groupSlug of market.groups) {
		const group = document.createElement("span");
		group.textContent = groupSlug;
		group.classList.add("clickable", "fancyOval");
		group.addEventListener("click", function() {
			document.getElementById("groups").value = groupSlug;
			uiControlFlow("filtersChanged");
		});
		createTooltip(group, "group");
		groupsList.appendChild(group);
	}

	const creator = row.querySelector(".creatorVisibility");
	creator.textContent = market.creatorUsername;
	createTooltip(creator, "creator");

	const closeTime = row.querySelector(".closeTimeVisibility");
	if (market.hasOwnProperty("closeTime")) {
		let string = formatDateDistance(market.closeTime);
		closeTime.textContent = string[0].toUpperCase() + string.slice(1);
	} else {
		closeTime.textContent = "";
	}

	const liquidity = row.querySelector(".liquidityVisibility");
	if (market.hasOwnProperty("liquidity")) {
		liquidity.textContent = `M$${Math.round(market.liquidity).toLocaleString()}`;
	} else {
		liquidity.textContent = "";
	}

	const volume = row.querySelector(".volumeVisibility");
	if (market.hasOwnProperty("volume")) {
		volume.textContent = `M$${Math.round(market.volume).toLocaleString()}`;
	} else {
		volume.textContent = "";
	}

	const volume24Hours = row.querySelector(".volume24HoursVisibility");
	if (market.hasOwnProperty("volume24Hours")) {
		volume24Hours.textContent = `M$${Math.round(market.volume24Hours).toLocaleString()}`;
	} else {
		volume24Hours.textContent = "";
	}

	const totalTraders = row.querySelector(".totalTradersVisibility");
	if (market.hasOwnProperty("totalTraders")) {
		totalTraders.textContent = `${Math.round(market.totalTraders).toLocaleString()}`;
	} else {
		totalTraders.textContent = "";
	}

	const lastUpdate = row.querySelector(".lastUpdatedTimeVisibility");
	if (market.hasOwnProperty("lastUpdatedTime")) {
		let string = formatDateDistance(market.lastUpdatedTime);
		lastUpdate.textContent = string[0].toUpperCase() + string.slice(1);
	} else {
		lastUpdate.textContent = "";
	}

	const percentage = row.querySelector(".percentageVisibility");
	if (market.hasOwnProperty("probability")) {
		percentage.textContent = (Math.round(market.probability * 100 * 10) / 10).toFixed(1) + "%";
	} else {
		percentage.textContent = "";
	}

	//No changes ever need to be made to the dashboard button.

	const betting = row.querySelector(".bettingVisibility");
	const bettingMax = betting.querySelector(".bettingMax");
	bettingMax.value = Math.round(market.liquidity / 10);
	if (market.hasOwnProperty("probability")) {
		betting.style.display = "";
	} else {
		betting.style.display = "none";
	}
}

const createTooltip = function(element, type) {
	const tooltip = document.createElement("p");
	tooltip.classList.add("tooltip");
	element.appendChild(tooltip);
	const value = element.textContent;
	element.addEventListener("mouseover", function(event) {
		tooltip.style.display = "block";
		if (type === "group") {
			tooltip.textContent = numMarketsInGroup(value) + " markets";
		} else {
			tooltip.textContent = numMarketsWithCreator(value) + " markets";
		}
		tooltip.style.left = event.pageX + "px";
		tooltip.style.top = event.pageY - 40 + "px";
	});
	element.addEventListener("mouseleave", function() {
		tooltip.style.display = "none";
	});
}

const placeBet = async function(marketId, percentageInput, maxInput) {
	if (percentageInput.value === "") {
		alert("Please enter a percentage.");
		return;
	}
	if (maxInput.value === "") {
		alert("Please enter a manimum amount of mana to bet.");
		return;
	}
	//We don't pass in the market because it could change after the handler was created.
	const market = allMarketData[marketId];
	const probToBetTo = Number(percentageInput.value) / 100;
	const response = await fetch('/manifoldBettingMirror', {
		method: 'POST',
		body: JSON.stringify({
					'amount': Number(maxInput.value),
					'limitProb': probToBetTo,
					'outcome': market.probability > probToBetTo ? "NO" : "YES",
					'contractId': market.id,
					'expiresAt': Date.now() + 2000,
					'key': document.getElementById("apiKey").value,
			}),
		headers: {
					'Content-Type': 'application/json',
			}
	});
	const actualResponse = await response.json();
	console.log(actualResponse)
	if (actualResponse.message === "Invalid Authorization header.") {
		alert("Invalid API key");
	}
	if (actualResponse.error) {
		alert(actualResponse.error);
	}
	if (actualResponse.message) {
		alert(actualResponse.message);
	}
	if (actualResponse.betId) {
		maxInput.value = "";
		percentageInput.value = "";
	}
}

//Thank you ChatGPT.
function extractQuotedSubstrings(inputString) {
  const regex = /-?"([^"]*)"/g;
  const quotedSubstrings = [];
  let remainingString = inputString;
  let match;
  while ((match = regex.exec(inputString)) !== null) {
		quotedSubstrings.push({
			"negated": match[0].startsWith("-"),
			"string": match[1],
		}); // Add the quoted substring to the list
    remainingString = remainingString.replace(match[0], ''); // Remove the quoted substring from the remaining string
  }
  return {
    quotedSubstrings,
    remainingString: remainingString
  };
}
function parseQueryString(url) {
  const queryString = url.split('?')[1];
  if (!queryString) {
    return {};
  }
  const keyValuePairs = queryString.split('&');
  const params = {};
  keyValuePairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    params[key] = decodeURIComponent(value);
  });
  return params;
}
function formatDateDistance(inputTimestamp) {
  const inputDate = new Date(inputTimestamp);
  const currentDate = new Date();
  const date = new Date(inputDate);
  const millisecondsInSecond = 1000;
  const millisecondsInMinute = 60 * millisecondsInSecond;
  const millisecondsInHour = 60 * millisecondsInMinute;
  const millisecondsInDay = 24 * millisecondsInHour;
  const millisecondsInWeek = 7 * millisecondsInDay;
  const millisecondsInMonth = 30 * millisecondsInDay;
  const millisecondsInYear = 365 * millisecondsInDay;
  const timeDifference = date - currentDate;
  const absoluteTimeDifference = Math.abs(timeDifference);
  if (absoluteTimeDifference < millisecondsInSecond) {
    return timeDifference > 0 ? 'in 1 second' : '1 second ago';
  } else if (absoluteTimeDifference < millisecondsInMinute) {
    const seconds = Math.floor(absoluteTimeDifference / millisecondsInSecond);
    return `${timeDifference > 0 ? 'in' : ''} ${seconds} second${seconds === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else if (absoluteTimeDifference < millisecondsInHour) {
    const minutes = Math.floor(absoluteTimeDifference / millisecondsInMinute);
    return `${timeDifference > 0 ? 'in' : ''} ${minutes} minute${minutes === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else if (absoluteTimeDifference < millisecondsInDay) {
    const hours = Math.floor(absoluteTimeDifference / millisecondsInHour);
    return `${timeDifference > 0 ? 'in' : ''} ${hours} hour${hours === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else if (absoluteTimeDifference < millisecondsInWeek) {
    const days = Math.floor(absoluteTimeDifference / millisecondsInDay);
    return `${timeDifference > 0 ? 'in' : ''} ${days} day${days === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else if (absoluteTimeDifference < millisecondsInMonth) {
    const weeks = Math.floor(absoluteTimeDifference / millisecondsInWeek);
    return `${timeDifference > 0 ? 'in' : ''} ${weeks} week${weeks === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else if (absoluteTimeDifference < millisecondsInYear) {
    const months = Math.floor(absoluteTimeDifference / millisecondsInMonth);
    return `${timeDifference > 0 ? 'in' : ''} ${months} month${months === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  } else {
    const years = Math.floor(absoluteTimeDifference / millisecondsInYear);
    return `${timeDifference > 0 ? 'in' : ''} ${years} year${years === 1 ? '' : 's'}${timeDifference > 0 ? '' : ' ago'}`;
  }
}

//Split up an object between localstorage and the file system, for faster loading. Localstorage is gzipped to fit under the 5MB size limit. Saves them as an array, after removing irrelevant fields.
const savingWorker = new Worker("savingWorker.js");
const saveMarketData = async function() {
	const start = performance.now();
	const simpleMarkets = allMarketArray.map(market => Object.assign({}, market));
	for (let market of simpleMarkets) {
		//elementRef has to be removed before sending this to the worker because HTML elements can't be cloned.
		delete market.elementRef;
	}
	savingWorker.postMessage(simpleMarkets);
	//console.log(performance.now() - start)
}
savingWorker.onmessage = async function(message) {

	localStorage.setItem("savedMarketData", message.data.localStorage);

	const opfsRoot = await navigator.storage.getDirectory();
	const fileHandle = await opfsRoot.getFileHandle('savedMarketData', {create: true});
	const writable = await fileHandle.createWritable();
	await writable.write(message.data.fileSystem);
	await writable.close();

	//console.log(`Saved ${(message.data.localStorage.length / 1000000).toFixed(1)}MB to localStorage, ${(message.data.fileSystem.length / 1000000).toFixed(1)}MB to the file system`);

	setTimeout(saveMarketData, 60000)
}

const grabUpdates = async function() {
	let grabbedMarkets;
	try {
		grabbedMarkets = await (await fetch("recentlyChangedMarkets.json")).json();
	} catch (e) {
		console.error(e);
		return;
	}
	const startTime = performance.now();

	for (let id in grabbedMarkets) {
		if (allMarketData[id] === undefined || grabbedMarkets[id].lastUpdatedTime > (allMarketData[id].lastUpdatedTime || 0)) {
			addNormalizedFieldsToMarketData(grabbedMarkets[id]);
			pendingMarketsToAdd.push(grabbedMarkets[id]);
		}
	}
}

const sleep = async function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const newMarketLoop = async function() {
	while (true) {
		await grabUpdates();
		if (allRemoteMarketsLoaded) {
			await sleep(500);
		} else {
			await sleep(5000);//If the main file is still being streamed, we don't want to grab redundant data and slow down processing, but if the user is on a slow connection, we do need to grab updates before they expire on the server.
		}
	}
}
newMarketLoop();

document.getElementById("searchCriteria").addEventListener("input", function(event) {
	uiControlFlow("filtersChanged");
});
document.getElementById("question").focus();

for (let entryField of Object.values(allSettingsData)) {
	if (entryField.type === "visibilityOption") {
		const title = document.createElement("span");
		title.textContent = entryField.humanReadableName;
		title.classList.add("columnHeader", entryField.settingId);
		if (entryField.associatedSortingWeight) {
			title.classList.add("clickable");
		}

		title.addEventListener("click", function() {

			let wasAlreadySortedByThis = true;
			for (let weight of Object.values(allSettingsData)) {
				if (weight.type === "visibilityOption" && weight.associatedSortingWeight) {
					if (weight.settingId === entryField.settingId && allSettingsData[weight.associatedSortingWeight].currentValue < 0) {
						wasAlreadySortedByThis = false;
					}
					if (weight.settingId !== entryField.settingId && allSettingsData[weight.associatedSortingWeight].currentValue !== 0) {
						wasAlreadySortedByThis = false;
					}
				}
			}
			if (entryField.settingId === "questionVisibility") {
				updateSortingOptionDisplay({});
				updateSortingOptionValues();
				uiControlFlow("sortingChanged");
			} else if (entryField.associatedSortingWeight) {
				const obj = {};
				if (wasAlreadySortedByThis) {
					obj[entryField.associatedSortingWeight] = -1;
				} else {
					obj[entryField.associatedSortingWeight] = 1;
				}
				updateSortingOptionDisplay(obj);
				updateSortingOptionValues();
				uiControlFlow("sortingChanged");
			}
		});

		searchResultsTitleBar.appendChild(title);
	}
}

//Takes in each chunk of loaded data as a uint8array and returns parsed markets in an array, with normalized fields.
const networkLoadingWorker = new Worker("jsonStreamLoadingWorker.js");
const fileSystemLoadingWorker = new Worker("jsonStreamLoadingWorker.js");

const fetchNetworkMarketsInChunks = async function() {
	const response = await fetch("allMarketData.json");
	for await (const chunk of response.body) {
		networkLoadingWorker.postMessage(chunk);
	}
	networkLoadingWorker.postMessage("all done");
}
const fetchFileSystemMarketsInChunks = async function() {
	const opfsRoot = await navigator.storage.getDirectory();
	const fileHandle = await opfsRoot.getFileHandle('savedMarketData', {create: true});
	const file = await fileHandle.getFile();
	const stream = await file.stream();
	for await (const chunk of stream) {
		fileSystemLoadingWorker.postMessage(chunk);
	}
	fileSystemLoadingWorker.postMessage("all done");
}
fetchNetworkMarketsInChunks();
fetchFileSystemMarketsInChunks();

let allRemoteMarketsLoaded = false;
let allLocalMarketsLoaded = false;
const handleReturnedChunkOfMarkets = async function(data, origin) {
	if (data === "all done") {
		console.log(`All ${origin} markets loaded`);
		if (origin === "network") {
			allRemoteMarketsLoaded = true;
			saveMarketData();
		} else {
			allLocalMarketsLoaded = true;
		}
		return;
	}
	pendingMarketsToAdd.push(...data);

	createDatalists();
}

networkLoadingWorker.onmessage = function(message) {
	handleReturnedChunkOfMarkets(message.data, "network");
}
fileSystemLoadingWorker.onmessage = function(message) {
	handleReturnedChunkOfMarkets(message.data, "fileSystem");
}

document.getElementById("mixingWeights").addEventListener("input", function() {
	updateSortingOptionValues();
	uiControlFlow("sortingChanged");
});

document.getElementById("sortOrder").addEventListener("change", function() {
	if (document.getElementById("sortOrder").value === "Mixed") {
		updateSortingOptionDisplay({});
		uiControlFlow("sortingChanged");
	} else {
		const internalSortValue = Object.values(allSettingsData).filter(entryField => entryField.type === "sortingWeight" && entryField.humanReadableName === document.getElementById("sortOrder").value)[0].settingId;
		const obj = {};
		obj[internalSortValue] = 1
		updateSortingOptionDisplay(obj);
		updateSortingOptionValues();
		uiControlFlow("sortingChanged");
	}
});

document.getElementById("clear").addEventListener("click", function() {
	for (let id in allSettingsData) {
		const setting = allSettingsData[id];
		if (setting.type === "searchOption") {
			//Is this setting the value of some checkboxes and the checked status of some text inputs? Yes. Do I care? No.
			document.getElementById(setting.settingId).value = setting.defaultValue;
			document.getElementById(setting.settingId).checked = setting.defaultValue;
		}
	}
	uiControlFlow("filtersChanged");
});

const convertHumanDateToTimestamp = function(string) {
	string = string.trim().toLowerCase();
	let isNegative = false;
	if (Number(string) === 0) {
		return Date.now();
	}
	if (/^\d{1,4}([\/-]\d{1,4})?([-\/]\d{1,4})?$/.test(string)) {
		if (string.startsWith("-")) {
			isNegative = true;
			string = string.slice(1);
		}
		const tellMonthFromDay = function(str1, str2) {//Defaults to 1st one is month if it can't tell.
			let month, day;
			if (Number(str1) > 12) {
				day = Number(str1);
				month = Number(str2);
			} else {
				day = Number(str2);
				month = Number(str1);
			}
			return [month, day];
		}

		let year, month, day;
		const numStrings = string.split(/[/-]/);

		if (numStrings.length === 1) {
			year = new Date().getFullYear();
			month = new Date().getMonth();
			day = tellMonthFromDay(numStrings[0], numStrings[1])[1];
		}

		if (numStrings.length === 2) {
			year = new Date().getFullYear();
			month = tellMonthFromDay(numStrings[0], numStrings[1])[0];
			day = tellMonthFromDay(numStrings[0], numStrings[1])[1];
		}

		if (numStrings.length === 3) {
			//If the year is clearly last, we try to figure out whether it's DMY or MDY.
			if (numStrings[2].length === 4 || Number(numStrings[2]) > 31) {
				year = Number(numStrings[2]);
				month = tellMonthFromDay(numStrings[0], numStrings[1])[0];
				day = tellMonthFromDay(numStrings[0], numStrings[1])[1];
			} else {
				year = Number(numStrings[0]);
				month = Number(numStrings[1]);
				day = Number(numStrings[2]);
			}
		}
		return new Date(year, month - 1, day).getTime();
	}

	if (/(\d+(\.\d+)?[lceymfwdhis])+/.test(string)) {
		//This doesn't account for leap years, leap seconds, or differing month lengths. In order to not have unexpected near-term results, we treat all months as 31 days and all years as leap years. This does mean that searches further in the future than ~2150 can be off by a year or more, but we'll all be dead by then anyway.
		const mapping = {
			"l": 31557600000000,//Millenium
			"c": 3155760000000,//Century
			"e": 315576000000,//Decade
			"y": 31622400000,//Year
			"m": 2678400000,//Month
			"f": 1209600000,//Fortnight
			"w": 604800000,//Week
			"d": 86400000,//Day
			"h": 3600000,//Hour
			"i": 60000,//Minute
			"s": 1000,//Second
		}
		const sections = Array.from(string.matchAll(/\d+(\.\d+)?[lceymfwdhis]/g));
		let previousChar;
		let totalDistance = 0;
		for (let match of sections) {
			const section = match[0];
			let lastChar = section.slice(-1);
			const num = Number(section.slice(0, -1));
			//Special case to handle minutes and months both starting with m. We don't add any special cases for decades or centuries because mobody cares.
			if (lastChar === "m" && ["f", "w", "d", "h"].includes(previousChar)) {
				lastChar = "i";
			}
			totalDistance += mapping[lastChar] * num;
			previousChar = lastChar;
		}
		if (isNegative) {
			return Date.now() - totalDistance;
		} else {
			return Date.now() + totalDistance;
		}
	}

	//If the input string is invalid, use the current time, cause why not. (In particular users are told they can enter "0" or "now" for the current time.)
	return Date.now();
}

//Takes in a single string and outputs a collection of ranges. Each range is just one or two strings, type-dependent parsing is handled elsewhere.
const parseRangesFromNumberInput = function(string, isTemporal) {

	if (!isTemporal) {
		string = string.replaceAll(/[$M]/g, "");
	}

	//Without the filter it'll create an empty range if the input was empty.
	const ranges = string.replaceAll(/[% ]/g, "").split(",").filter(range => range !== "");

	for (let i in ranges) {
		let subranges;
		if (isTemporal) {
			subranges = ranges[i].split(":");
		} else {
			subranges = ranges[i].split(/[-:]/g);
		}

		if (subranges.length === 1) {
			ranges[i] = {
				"min": subranges[0].trim(),
				"max": subranges[0].trim(),
			}
		} else if (subranges.length === 2) {
			ranges[i] = {
				"min": subranges[0].trim(),
				"max": subranges[1].trim(),
			}
		} else {
			throw new Error(`Invalid numerical entry; cannot determined ranges`);
		}
	}

	return ranges;
}

const parseTypeOfNumericalInput = function(string, endOfScale, type) {
	if (string.trim() === "") {
		if (["closeTime", "createdTime", "lastUpdatedTime"].includes(type)) {
			if (endOfScale === "min") {
				return Number.MIN_SAFE_INTEGER;
			} else {
				return Number.MAX_SAFE_INTEGER;
			}
		} else if (type === "percentage") {
			if (endOfScale === "min") {
				return 0;
			} else {
				return 1;
			}
		} else {
			if (endOfScale === "min") {
				return 0;
			} else {
				return Number.MAX_SAFE_INTEGER;
			}
		}
	}
	let returnNum;
	if (["closeTime", "createdTime", "lastUpdatedTime"].includes(type)) {
		returnNum = convertHumanDateToTimestamp(string)
	} else {
		returnNum = Number(string);
	}
	if (type === "percentage") {
		returnNum /= 100;
		if (returnNum > 1) {
			throw new Error(`Invalid numerical entry for ${type}; percentage cannot be more than 100`);
		}
	}
	if (Number.isNaN(returnNum)) {
		throw new Error(`Invalid numerical entry for ${type}; entry cannot be converted to a number`);
	}
	return returnNum;
}

const exportResults = function() {
	document.getElementById('exportDiv').style.display = "block";
	if (document.getElementById("exportUrl").checked) {
		document.getElementById("exportData").value = currentMarketArray.map(market => marketUrl(market)).join("\n");
	} else if (document.getElementById("exportQuestion").checked) {
		document.getElementById("exportData").value = currentMarketArray.map(market => market.question).join("\n");
	} else {
		document.getElementById("exportData").value = currentMarketArray.map(market => market.id).join("\n");
	}
}

const numMarketsInGroup = function(group) {
	return allMarketArray.filter(market => market.groups.includes(group)).length;
}
const numMarketsWithCreator = function(creator) {
	return allMarketArray.filter(market => market.creatorUsername === creator).length;
}

let queryParams = parseQueryString(window.location.href);
if (queryParams.justshoveitallintooneparameter) {
	queryParams = parseQueryString("https://outsidetheasylum.blog/manifold-search/?" + queryParams.justshoveitallintooneparameter);
}
const paramsToSet = queryParams;
for (let id in allSettingsData) {
	const setting = allSettingsData[id];
	if (!paramsToSet.hasOwnProperty(setting.settingId)) {
		paramsToSet[setting.settingId] = setting.defaultValue;
	}
	if (typeof setting.defaultValue === "boolean") {
		if (typeof paramsToSet[setting.settingId] !== "boolean") {
			paramsToSet[setting.settingId] = ["t", "true"].includes(paramsToSet[setting.settingId]);
		}
		document.getElementById(setting.settingId).checked = paramsToSet[setting.settingId];
	}
	if (typeof setting.defaultValue === "number") {
		paramsToSet[setting.settingId] = Number(paramsToSet[setting.settingId]);
		document.getElementById(setting.settingId).value = paramsToSet[setting.settingId];
	}
	if (typeof setting.defaultValue === "string") {
		paramsToSet[setting.settingId] = paramsToSet[setting.settingId].replace(/\+/g, " ");
		document.getElementById(setting.settingId).value = paramsToSet[setting.settingId];
	}
}
updateVisibilityOptions();
updateSortingOptionDisplay(paramsToSet);//The extra fields are ignored.
updateSortingOptionValues();
uiControlFlow("visibilityChanged");

let lucky = false;
if (queryParams.lucky && ["t", "true"].includes(queryParams.lucky)) {
	lucky = true;
}


const locallyStoredMarketDataString = localStorage.getItem("savedMarketData");
if (locallyStoredMarketDataString) {
	let loadedMarkets;
	try {
		loadedMarkets = JSON.parse(gzipToText(locallyStoredMarketDataString));
		//Used to be saved as an object, this can be removed later.
		if (!Array.isArray(loadedMarkets)) {
			loadedMarkets = Object.values(loadedMarkets);
		}
	} catch (e) {
		console.error(e);
		loadedMarkets = [];
	}
	for (let market of loadedMarkets) {
		addNormalizedFieldsToMarketData(market);
	}
	pendingMarketsToAdd.push(...loadedMarkets);
	console.log(`Loaded ${Object.keys(loadedMarkets).length} markets from localStorage`);
}

addMarkets();
