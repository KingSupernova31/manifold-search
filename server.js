"use strict";

const express = require("express"),
	app = express(),
	bodyParser = require("body-parser"),
	compression = require("compression"),
	fs = require("fs"),
	cors = require("cors"),
	fetch = require('node-fetch');

const corsOptions = {
  origin: true,
  optionsSuccessStatus: 200,
}
app.options('*', cors());

app.use(compression());
app.use(bodyParser.json({"limit":"1mb"}));
app.use(bodyParser.urlencoded({"extended": true}));
app.use(express.static("./public_html"));

const server = app.listen(8081, function () {
	console.log("Listening on port 8081");
});

app.post("/manifoldBettingMirror", cors(corsOptions), async function(req, res) {
	console.log(req.body)
	try {
		const response = await fetch('https://manifold.markets/api/v0/bet', {
		  method: 'POST',
		  body: JSON.stringify(req.body),
		  headers: {
				'Content-Type': 'application/json',
				'Authorization': `Key ${req.body.key}`
			}
		});
		res.send(await response.json());
	} catch(e) {
		console.error(e);
		res.send({"error": "Server error"});
	}
});
