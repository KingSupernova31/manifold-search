module.exports = {
	apps : [
		{
			"name": "server",
			"script": "server.js",
			"watch": "server.js",
			"log_date_format": "YYYY-MM-DD HH:mm"
		},
		{
			"name": "maintainMarketData",
			"script": "maintainMarketData.js",
			"watch": ["maintainMarketData.js", "../../manifoldFunctions.js"],
			"log_date_format": "YYYY-MM-DD HH:mm",
			"max_memory_restart": "750M",
			"cwd": "public_html/manifold-search/"
		},
	]
};
