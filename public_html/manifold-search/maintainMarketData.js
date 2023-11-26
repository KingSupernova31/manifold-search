//This script uses a lot of memory and PM2 doesn't like that, so it should be started with --max-memory-restart 750M

"use strict";

console.log("Starting script")
const fs = require('fs');
const util = require('util');
const manifoldFunctions = require("../../manifoldFunctions.js");
const writeFilePromise = util.promisify(fs.writeFile);

const sleep = async function(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const publicallyListedMarketIds = {};

//Debugging function to notice when anything is blocking for too long.
let lastTime = performance.now()
setInterval(function() {
	const delta = performance.now() - lastTime
	if (delta > 30) {
		//console.log(delta);
	}
	lastTime = performance.now();
}, 1)

let runningMarketData;
try {
	runningMarketData = {};
	//The file is saved as an array so it's smaller to send across the internet, (and so there's a well-defined order the client loads it in) but we need it as an object here for fast access.
	const array = JSON.parse(fs.readFileSync("allMarketData.json"));
	for (let market of array) {
		runningMarketData[market.id] = market;
	}
} catch (e) {
	console.log("No market data found, it will be regenerated from scratch.");
	runningMarketData = {};
}
let recentlyChangedMarkets = {};

const queuedMarketQueries = [];

//Array randomizer. Shuffles in place.
const shuffle = function(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
}

const getAndFormatMarketData = async function(marketId) {
	let apiInfo;
	try {
		apiInfo = await manifoldFunctions.getMarketInfo(marketId);
		//Sometimes the API returns corrupted data.
		if (!apiInfo || !apiInfo.hasOwnProperty("id") || !apiInfo.hasOwnProperty("slug") || !apiInfo.hasOwnProperty("createdTime") || !apiInfo.hasOwnProperty("creatorUsername")) {
			if (!apiInfo) {
				console.log("Missing API info");
			} else {
				console.log(apiInfo)
				console.log("Corrupted API info");
			}
			return "corrupted";
		}
	} catch(e) {
		console.log(e.message);
		return "corrupted";
	}

	return formatApiData(apiInfo);
}

const formatApiData = function(apiInfo) {
	let result = {
		"id": apiInfo.id,
		"question": apiInfo.question,//Missing if blank
		"description": apiInfo.textDescription,//Missing if blank
		"closeTime": apiInfo.closeTime,//Missing from all bounty markets and some (not all) polls
		"createdTime": apiInfo.createdTime,
		"slug": apiInfo.slug,
		"liquidity": apiInfo.totalLiquidity,//Missing from bounty markets and polls
		"totalTraders": apiInfo.uniqueBettorCount,//Missing from bounty markets and polls
		"volume": apiInfo.volume,//Missing from bounty markets and polls
		"volume24Hours": apiInfo.volume24Hours,//Missing from bounty markets and polls
		"probability": apiInfo.probability,//Missing from any non-binary market, except numeric due to a bug.
		"creatorUsername": apiInfo.creatorUsername,
		"groups": apiInfo.groupSlugs,//Missing if it has no groups.
		"answers": apiInfo.answers?.map(answer => answer.text),//Missing on all except multiple choice markets
		"lastUpdatedTime": apiInfo.lastUpdatedTime,//We update this ourselves when a market's fields change due to this script changing, so it's not the same as the API gives.
		"resolution": apiInfo.resolution,//If the market is not resolved, this is null. If it is resolved, it's the resolution probability. (YES is 1 and NO is 0.) (Or an answer ID for multiple choice. Or "CHOOSE_MULTIPLE". Or "CANCEL");
		"type": apiInfo.outcomeType + (apiInfo.mechanism === "none" ? "" : ":" + apiInfo.mechanism),
	};

	if (apiInfo.isResolved === false) {
		result.resolution = null;
	}
	if (apiInfo.resolution === "YES") {
		result.resolution = 1;
	}
	if (apiInfo.resolution === "NO") {
		result.resolution = 0;
	}
	if (apiInfo.resolution === "MKT") {
		result.resolution = apiInfo.resolutionProbability;
	}
	return result;
}

const marketsHaveSameProps = function(market1, market2) {
	const market1Keys = Object.keys(market1);
	const market2Keys = Object.keys(market2);
	if (market1Keys.length !== market2Keys.length) {
		return false;
	}
	for (let key of market1Keys) {
		if (!market2Keys.includes(key)) {
			return false;
		}
	}
	return true;
}

const getNewMarkets = async function() {
	try {
		const potentiallyNewMarkets = await manifoldFunctions.getMostRecent1000MarketsBeforeId();
		const actuallyNewMarkets = [];
		for (let market of potentiallyNewMarkets) {
			if (!runningMarketData[market.id]) {
				actuallyNewMarkets.push(market);
			}
		}
		return actuallyNewMarkets;
	} catch (e) {
		console.log(e.message)
		return [];
	}
}

let betsFromLastTime = {};
const getNewBets = async function() {
	try {
		const potentiallyNewBets = await manifoldFunctions.getMostRecent1000BetsBeforeId();
		const actuallyNewBets = [];
		const newSavedBets = {};
		for (let bet of potentiallyNewBets) {
			newSavedBets[bet.id] = true;
			if (!betsFromLastTime[bet.id]) {
				actuallyNewBets.push(bet);
			}
		}
		betsFromLastTime = newSavedBets;
		return actuallyNewBets;
	} catch (e) {
		console.log(e.message)
		return [];
	}
}

const addMarketIdToQueue = function(id, priority) {
	if (priority) {
		queuedMarketQueries.unshift(id);
	} else {
		queuedMarketQueries.push(id);
	}
	//Each market should only be in the queue once, so we remove any after the first.
	const querySet = new Set();
	const beforeLength = queuedMarketQueries.length;
	for (let i = 0 ; i < queuedMarketQueries.length ; i++) {
		if (querySet.has(queuedMarketQueries[i])) {
			queuedMarketQueries.splice(i, 1);
			i--;
		}
		querySet.add(queuedMarketQueries[i]);
	}
	return beforeLength === queuedMarketQueries.length;
}

const relevanceOf = function(market) {
	let relevance = 0;
	if (market.hasOwnProperty("totalTraders")) {
		relevance = market.totalTraders;
	}
	if (market.closeTime < Date.now()) {
		relevance /= 10;
	}
	return relevance;
}

const addRecentlyChangedMarkets = function(markets) {
	for (let market of markets) {
		recentlyChangedMarkets[market.id] = {
			"time": Date.now(),
			"market": market,
		}
	}
}

const fetchQueuedMarket = async function() {
	const id = queuedMarketQueries.shift();
	const data = await getAndFormatMarketData(id);
	if (data === "corrupted") {
		console.log(`Data corrupted for market ${id}, pushing to back of queue.`);
		addMarketIdToQueue(id);
	} else {
		if (JSON.stringify(runningMarketData[id]) !== JSON.stringify(data)) {
			data.lastUpdatedTime = Date.now();
			runningMarketData[id] = data;
			addRecentlyChangedMarkets([data]);
		}
	}
}

const liteMarketPropsDiffer = function(liteMarket, myMarket) {
	const liteMarketProps = ["resolution", "creatorUsername", "createdTime", "closeTime", "question", "slug", "liquidity", "type", "volume", "volume24Hours", "totalTraders", "probability"];
	const formattedLiteMarket = formatApiData(liteMarket);
	for (let prop of liteMarketProps) {
		if (formattedLiteMarket[prop] !== myMarket[prop]) {
			return true;
		}
	}
	//This script updates a market's lastUpdatedTime when we update our database's representation of that market, even if nothing about the market has changed. (This happens when this script changes what data it logs or the format it stores it in.) So a market from the API could have an older lastUpdatedTime than our saved copy, and that doesn't mean we need to re-fetch the market.
	if (formattedLiteMarket.lastUpdatedTime > myMarket.lastUpdatedTime) {
		return true;
	}
	return false;
}

/*
List of loops that run constantly:

Every 200ms, trim the recently changed markets object to only contain markets updated within the past 15 seconds and write it to disk.

Every 10 seconds, update the main market file.

Get /bets repeatedly (only the most recent 1000), no delay in between. Every time it returns, update market objects with the new probabilities and new lastUpdatedTime, and add them to recentlychangedmarkets. If the bet is for a market that we don't have data for, add it to queuedMarketQueries.

Get /markets repeatedly (only the most recent 1000), no delay in between. For every new market that we don't already have, update the market objects with partial market data, add them to recentlychangedmarkets, and add the ids to queuedMarketQueries.

X at a time, fetch full data for the first market in the queue and add it to runningMarketData and recentlychangedmarkets. X varies based on the length of the queue.

Cyclically go through all liteMarkets from /markets, 1000 at a time. Any that aren't in our database, have a newer lastUpdatedTime, or have different properties, add to the queue.

Once per 10ms, if queuedMarketQueries has <3 markets, bring it up to 5, slowly going through all markets to catch any changes that everything else missed. (Right now that's all description changes, since a bug on Manifold causes that to not affect their lastUpdatedTime. Once that's fixed this will still be necessary for the cases where this script changes what it saves from the request, so that it can rebuild old markets.)

*/

//Keep recently changed markets to last 15 seconds and write to file.
setInterval(function() {
	for (let id in recentlyChangedMarkets) {
		if (recentlyChangedMarkets[id].time < performance.now() - 15000) {
			delete recentlyChangedMarkets[id];
		}
	}
	const fileObj = {};
	for (let id in recentlyChangedMarkets) {
		fileObj[id] = recentlyChangedMarkets[id].market;
	}
	fs.writeFileSync("recentlyChangedMarketsNew.json", JSON.stringify(fileObj));
	fs.renameSync("recentlyChangedMarketsNew.json", "recentlyChangedMarkets.json");
}, 200);

//Update main file. Very memory intensive as it has to copy the entire market data object, so if we get OOM errors it's probably this.
const saveMainFile = async function() {
	while (true) {
		await sleep(10000);

		//console.log("Updating main file");

		const start = performance.now();
		const arrayToSave = Object.values(runningMarketData);
		//Sorted so that the client loads the most relevant markets first.
		arrayToSave.sort(function(a, b) {
			return relevanceOf(b) - relevanceOf(a);
		});

		await writeFilePromise("allMarketDataNew.json", JSON.stringify(arrayToSave));
		fs.renameSync("allMarketDataNew.json", "allMarketData.json");
	}
};
saveMainFile();

//Watch recent bets.
const betLoop = async function() {
	while (true) {
		let newBets;
		try {
			newBets = await getNewBets();
		} catch (e) {
			console.error(e);
			continue;
		}
		if (newBets.length > 0) {
			console.log(`Loaded ${newBets.length} new bets`);
		}
		const updatedMarkets = [];
		for (let bet of newBets) {
			const market = runningMarketData[bet.contractId];
			if (market === undefined) {//If a market was bet on immediately after creation, we could get a bet on a market that doesn't exist in our database yet.
				addMarketIdToQueue(bet.contractId, true);
			} else {
				if (!bet.hasOwnProperty("answerId")) {
					market.probability = bet.probAfter;
					market.lastUpdatedTime = bet.timestamp;
					updatedMarkets.push(market);
				}
			}
		}
		addRecentlyChangedMarkets(updatedMarkets);
	}
}
betLoop();

//Watch recent markets
const newMarketLoop = async function() {
	while (true) {
		let newMarkets = [];
		try {
			newMarkets = await getNewMarkets();
		} catch(e) {
			console.log(e.message)
			console.log("New markets corrupted, skipping");
			continue;
		}
		if (newMarkets.length > 0) {
			console.log("Loaded " + newMarkets.length + " new markets");
		}

		const updatedMarkets = [];
		for (let market of newMarkets) {
			runningMarketData[market.id] = formatApiData(market);
			updatedMarkets.push(runningMarketData[market.id]);
			addMarketIdToQueue(market.id, true);
		}
		addRecentlyChangedMarkets(updatedMarkets);
	}
}
newMarketLoop();

//Process the queue of fullmarkets that we need to fetch. Usually just one per iteration, but if the queue is getting full we send several requests.
const queueLoop = async function() {
	while (true) {
		if (queuedMarketQueries.length === 0) {
			await sleep(50);
			continue;
		}
		let panicNumber = Math.min(Math.floor(queuedMarketQueries.length / 4), 20);
		while (panicNumber > 0) {
			fetchQueuedMarket();
			panicNumber--;
		}
		await fetchQueuedMarket();
	}
}
queueLoop();

//Cyclically go through all liteMarkets from /markets, 1000 at a time. Any that aren't in our database or have a lastUpdatedTime that isn't equal to the one in our database, add to the queue. Will take >1 minute to go through all markets, maybe speed this up eventually.
let cycledThroughAllPublicMarkets = false;
const existingMarketLoop = async function() {
	let lastId;
	while (true) {
		let liteMarkets;
		try {
			liteMarkets = await manifoldFunctions.getMostRecent1000MarketsBeforeId(lastId);
		} catch (e) {
			console.log(e.message);
			continue;
		}

		for (let liteMarket of liteMarkets) {
			publicallyListedMarketIds[liteMarket.id] = true;
		}

		for (let liteMarket of liteMarkets) {
			if (runningMarketData[liteMarket.id] === undefined || liteMarketPropsDiffer(liteMarket, runningMarketData[liteMarket.id])) {
				addMarketIdToQueue(liteMarket.id)
				//When this script is updated and all >80000 markets need to be rebuilt, we don't want to push them all into the queue at once, since that will prevent live updates to market data being caught. Also this loop can take more than one 1 second when run on all 1000 markets, which was causing requests to time out.
				if (queuedMarketQueries.length >= 30) {
					break;
				}
			}
		}

		lastId = liteMarkets[liteMarkets.length - 1].id;
		if (liteMarkets.length < 1000) {
			lastId = undefined;
			cycledThroughAllPublicMarkets = true;
		}
	}
}
existingMarketLoop();

//Once per 10ms, if queuedMarketQueries has <3 markets, bring it up to 5, slowly going through all markets to catch any changes that everything else missed. (Right now that's all description changes, since a bug on Manifold causes that to not affect their lastUpdatedTime. Once that's fixed this will still be necessary for the cases where this script changes what it saves from the request, so that it can rebuild old markets.)
let marketsToRebuild = [];
setInterval(function() {
	while (queuedMarketQueries.length < 3) {
		if (marketsToRebuild.length === 0) {
			marketsToRebuild = Object.keys(runningMarketData);
			console.log(`Cycled through all ${marketsToRebuild.length} markets, restarting.`);
			shuffle(marketsToRebuild);
		}
		addMarketIdToQueue(marketsToRebuild.pop());
	}
}, 10);

//The current market and bet loops won't catch changes to unlisted markets, and waiting for the all market loop to do so is too slow, so we cycle through them separetly.
const unlistedMarketsToCheck = [];
setInterval(function() {
	if (unlistedMarketsToCheck.length === 0 && cycledThroughAllPublicMarkets) {
		for (let marketId in runningMarketData) {
			if (!publicallyListedMarketIds[marketId]) {
				unlistedMarketsToCheck.push(marketId);
			}
		}
		console.log(`Cycled through all ${unlistedMarketsToCheck.length} unlisted markets, restarting.`);
	}
	addMarketIdToQueue(unlistedMarketsToCheck.pop());
}, 2000);
