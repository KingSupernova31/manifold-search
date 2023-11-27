importScripts("compress.js");
//Takes in an array of simpleMarkets and saves it.
onmessage = function(message) {

	const localStorage = [],
				fileSystem = [];

	for (let market of message.data) {
		//Medium size open markets and large closed markets get saved in localstorage for faster immediate searching. Localhose is size-limited so we remove the normalized fields there. Filestore is not, so we leave them. (Didn't seem to be any significant performance difference between removing them or leaving them or gzipping or not.)
		if (market.liquidity > 5000 || (market.liquidity > 400 && market.closeTime > Date.now())) {
			delete market.normalizedQuestion;
			delete market.normalizedDescription;
			delete market.normalizedAnswers;
			delete market.normalizedGroups;
			localStorage.push(market);
		} else {
			fileSystem.push(market);
		}
	}

	const returnObj = {
		"localStorage": textToGzip(JSON.stringify(localStorage)),
		"fileSystem": JSON.stringify(fileSystem),
	};

	postMessage(returnObj);
}