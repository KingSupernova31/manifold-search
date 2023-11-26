let r = new RegExp("\\p{Diacritic}| |-|,|'|\"|\\.", "gu");
const normalizeString = function(str) {
	const startTime = performance.now();
	let result = str.normalize("NFD").replace(r, "").toLowerCase();
	return result;
}

const addNormalizedFieldsToMarketData = function(market) {
	if (market.question) {
		market.normalizedQuestion = normalizeString(market.question);
	} else {
		market.question = "";
		market.normalizedQuestion = "";
	}
	if (market.description) {
		market.normalizedDescription = normalizeString(market.description);
	} else {
		market.description = "";
		market.normalizedDescription = "";
	}
	if (market.hasOwnProperty("answers")) {
		market.normalizedAnswers = [];
		for (let answer of market.answers) {
			market.normalizedAnswers.push(normalizeString(answer))
		}
	} else {
		market.answers = [];
		market.normalizedAnswers = [];
	}
	if (market.hasOwnProperty("groups")) {
		market.normalizedGroups = [];
		for (let group of market.groups) {
			market.normalizedGroups.push(normalizeString(group))
		}
	} else {
		market.groups = [];
		market.normalizedGroups = [];
	}
}