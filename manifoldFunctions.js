const axios = require('axios');

const placeBet = async function(amount, marketId, outcome, limitProb, key) {
	try {
		const response = await axios.post(
			'https://api.manifold.markets/v0/bet',
			{
				'amount': amount,
				'outcome': outcome,
				'contractId': marketId,
				'limitProb': limitProb,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const sellShares = async function(marketId, numShares, key) {
	try {
		const response = await axios.post(
			`https://api.manifold.markets/v0/market/${marketId}/sell`,
			{
				'shares': numShares
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const placeComment = async function(markdown, marketId, key) {
	try {
		const response = await axios.post(
			'https://api.manifold.markets/v0/comment',
			{
				'markdown': markdown,
				'contractId': marketId
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const createMarket = async function(type, question, description, closeTime, percentage, answers, addAnswersMode, visibility, key) {
	try {
		const response = await axios.post(
			'https://api.manifold.markets/v0/market',
			{
				'outcomeType': type,
				'question': question,
				'description': description,
				'closeTime': closeTime,
				'initialProb': percentage,
				'answers': answers,
				'addAnswersMode': addAnswersMode,
				'visibility': visibility,
				'groupId': "Magic: The Gathering"
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const getMarketInfo = async function(marketId) {
	const response = await axios.get(
		`https://api.manifold.markets/v0/market/${marketId}`,
		{
			"headers": {
				'Content-Type': 'application/json'
			},
			"timeout": 11000,
		}
	);
	if (response.error) {
		throw new Error(response.error);
	}
	return response.data;
}

const getMarketPositions = async function(marketId) {
	try {
		const response = await axios.get(
			`https://api.manifold.markets/v0/market/${marketId}/positions`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
		return response.data;
	} catch (err) {
		return err.response;
	}
}

const getMarketIDBySlug = async function(marketSlug) {
	try {
		const response = await axios.get(
			`https://api.manifold.markets/v0/slug/${marketSlug}`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
		return response.data.id;
	} catch (err) {
		return err.response;
	}
}

const resolveMarket = async function(marketId, resolution, key) {
	try {
		const response = await axios.post(
			`https://api.manifold.markets/v0/market/${marketId}/resolve`,
			{
				'outcome': resolution
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const closeMarket = async function(marketId, closeTime, key) {
	try {
		const response = await axios.post(
			`https://api.manifold.markets/v0/market/${marketId}/close`,
			{
				'closeTime': closeTime
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response;
	} catch (err) {
		return err.response;
	}
}

const getAllUsers = async function() {
	try {
		const allUsers = [];

		const getSomeUsers = async function(beforeID) {
			const response = await axios.get(
				`https://api.manifold.markets/v0/users?limit=1000${beforeID ? "&before=" + beforeID : ""}`,
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			allUsers.push(...response.data)
			if (response.data.length === 1000) {
				return await getSomeUsers(response.data[response.data.length - 1].id)
			} else {
				return allUsers;
			}
		}

		return await getSomeUsers();
	} catch (err) {
		return err.response;
	}
}

const getMostRecent1000MarketsBeforeId = async function(beforeId) {
	const response = await axios.get(
		`https://api.manifold.markets/v0/markets?limit=1000${beforeId ? "&before=" + beforeId : ""}`,
		{
			headers: {
				'Content-Type': 'application/json',
			},
			"timeout": 12000,
		}
	);
	if (response.error) {
		throw new Error(response.error);
	}
	return response.data;
}

const getAllMarkets = async function(verbose) {
	if (verbose) {
		console.log("Fetching all markets.");
	}
	const allMarkets = [];
	const lastRequests = [];
	while (true) {
		if (lastRequests.length >= 3 && lastRequests.slice(-1)[0] === lastRequests.slice(-2, -1)[0] && lastRequests.slice(-1)[0] === lastRequests.slice(-3, -2)[0]) {
			throw new Error("getMostRecent1000MarketsBeforeId failed 3 times in a row, giving up");
		}

		const nextId = allMarkets[allMarkets.length - 1]?.id;
		lastRequests.push(nextId);
		try {
			const someMarkets = await getMostRecent1000MarketsBeforeId(nextId);
			allMarkets.push(...someMarkets);
			if (verbose) {
				console.log(`Fetched ${allMarkets.length} markets`);
			}
			if (someMarkets.length < 1000) {
				break;
			}
		} catch (e) {
			console.log(`getMostRecent1000MarketsBeforeId failed with message "${e.toString()}", trying again`);
		}
	}
	return allMarkets;
}

const getCurrentUser = async function(key) {
	try {
		const response = await axios.get(
			`https://api.manifold.markets/v0/me/`,
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Key ${key}`
				}
			}
		);
		return response.data;
	} catch (err) {
		return err.response;
	}
}

const getUserById = async function(id) {
	try {
		const response = await axios.get(
			`https://api.manifold.markets/v0/user/by-id/${id}`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
		return response.data;
	} catch (err) {
		return err.response;
	}
}

const getMostRecent1000BetsBeforeId = async function(marketId, username, beforeId) {
	const response = await axios.get(
		`https://api.manifold.markets/v0/bets?limit=1000${marketId ? "&contractId=" + marketId : ""}${username ? "&username=" + username : ""}${beforeId ? "&before=" + beforeId : ""}`,
		{
			headers: {
				'Content-Type': 'application/json'
			},
			"timeout": 13000,
		}
	);
	if (response.error) {
		throw new Error(response.error);
	}
	return response.data;
}

const getAllBets = async function(marketId, username, verbose) {
	if (verbose) {
		console.log("Fetching all bets.");
	}
	const allBets = [];
	const lastRequests = [];
	while (true) {
		if (lastRequests.length >= 3 && lastRequests.slice(-1)[0] === lastRequests.slice(-2, -1)[0] && lastRequests.slice(-1)[0] === lastRequests.slice(-3, -2)[0]) {
			throw new Error("getMostRecent1000BetsBeforeId failed 3 times in a row, giving up");
		}

		const nextId = allBets[allBets.length - 1]?.id;
		lastRequests.push(nextId);
		try {
			const someBets = await getMostRecent1000BetsBeforeId(marketId, username, nextId);
			allBets.push(...someMarkets);
			if (verbose) {
				console.log(`Fetched ${allBets.length} bets`);
			}
			if (someBets.length < 1000) {
				break;
			}
		} catch (e) {
			console.log(`getMostRecent1000BetsBeforeId failed with message "${e.toString()}", trying again`);
		}
	}
	return allBets;
}

module.exports = {
	"getAllUsers": getAllUsers,
	"resolveMarket": resolveMarket,
	"placeBet": placeBet,
	"placeComment": placeComment,
	"createMarket": createMarket,
	"getMarketInfo": getMarketInfo,
	"getMarketIDBySlug": getMarketIDBySlug,
	"getAllBets": getAllBets,
	"getMarketPositions": getMarketPositions,
	"getCurrentUser": getCurrentUser,
	"getUserById": getUserById,
	"closeMarket": closeMarket,
	"sellShares": sellShares,
	"getAllMarkets": getAllMarkets,
	"getMostRecent1000MarketsBeforeId": getMostRecent1000MarketsBeforeId,
	"getMostRecent1000BetsBeforeId": getMostRecent1000BetsBeforeId,
};
