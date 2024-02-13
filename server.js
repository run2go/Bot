// server.js

require('dotenv').config({ path: 'config.cfg' }); // Access parameters in the config.ini file
const serverName = process.env.SERVER_NAME;
const serverPort = process.env.SERVER_PORT;
const serverURL = process.env.SERVER_URL;
const redirectURL = process.env.REDIRECT_URL;
const discordToken = process.env.TOKEN;
const discordAppId = process.env.APP_ID;

const console = require('./log.js'); // Use the logging functionality inside the log.js file
const express = require('express'); // Make use of the express.js framework for the core application

const app = express();
app.use(express.json()); // Middleware to parse JSON in request body

let server; // Declare server variable

async function serverRun() {
	try {		
		console.log(`${serverName} started`); // Notify that the server has been started
		server = app.listen(serverPort, () => { console.log(`Now listening on port ${serverPort}`); }); // Bind the server to the specified port
		
		function handleRequest(req) {
			console.debug(`Request:\nHeader:\n${JSON.stringify(req.headers)}\nParams:\n${JSON.stringify(req.params)}\nBody:\n${JSON.stringify(req.body)}`);
		}
		
		function handleResponse(req, res, type, statusCode, success, response) {
			const ipHead = req.headers['x-forwarded-for'] || '';
			const ipConn = req.connection.remoteAddress || '';
			const authorization = req.headers['authorization'] || '';
			const userAgent = req.headers['user-agent'] || '';
			const contentType = req.headers['content-type'] || '';

			console.log(`[IP] "${ipHead} - ${ipConn}" [TYPE] "${type}"${authorization ? ` [AUTH] "${authorization}"` : ''}${userAgent ? ` [USER-AGENT] "${userAgent}"` : ''}${contentType ? ` [CONTENT-TYPE] "${contentType}"` : ''} [STATUS] "${statusCode}"`);
			console.debug(`Response Code ${statusCode}:\n${response}`);

			if (res && statusCode === 200) { res.status(200).json({ success, data: response }); }
			else if (res) { res.status(statusCode).json({ success, error: response }); }
		}
		
		let result;
		
		app.get("*", (req, res) => { // Forward GET requests to the specified redirectURL
			handleRequest(req);
			handleResponse(req, null, "GET", 200, true, result);
			res.redirect(redirectURL);
		});

		app.post("*", async (req, res) => { // Handle all POST requests
			handleRequest(req);
			try {
				const [ userHeader, passHeader ] = getHeaderData(req.headers['authorization']) // Get authorization header data
				const { test } = req.body; // Deconstruct request body

				let statusCode = 200;
				let statusSuccess = true;
				let response;
				
				if (!authCheck(userHeader, passHeader)) { [statusCode, statusSuccess, response] = [200, success, "Unauthorized"]; return; } // Validate the provided credentials
				else if (test) { [statusCode, statusSuccess, response] = [200, success, "You transmitted:\n" + test ]; } // User Management
				else { [statusCode, statusSuccess, response] = [404, false, "Not Found"]; return; } // Dismiss out-of-the-order requests
				
				handleResponse(req, res, "POST", statusCode, statusSuccess, result);
			} catch (error) { handleResponse(req, res, "POST", 400, false, error.message); }
		});

		async function authCheck(user, pass) {
			const bcrypt = require('bcrypt'); // Make use of BCRYPT for password hashing & checking
			if (user === "token") {  return !!tokenList.includes(pass); } // Single token authentication
			else { return !!userData.find(async (u) => u.username === user && u.deletedAt === null && await bcrypt.compare(u.password, pass)); } // Username & password authentication
		}

		function getHeaderData(header) {
			if (header && header.startsWith('Basic ')) {
				const base64Credentials = header.slice('Basic '.length); // Extract the base64-encoded credentials (excluding the 'Basic ' prefix)
				const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8'); // Decode the base64 string to a UTF-8 string
				[user, pass] = credentials.split(':'); // Split the username and password using the colon as a delimiter
				return [user, pass];
			}
			throw new Error(`Authentication Failed`);
		}

		const { Client, Events, GatewayIntentBits } = require('discord.js');
		const client = new Client({ intents: [GatewayIntentBits.Guilds]});
		function discordBotLogin() {
			client.once(Events.ClientReady, readyclient => {
				console.log(`Logged in as ${readyClient.user.tag}`);
			});
			client.login(token);
		}

		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function (text) { // Allow console commands
			switch(text.trim()) {
				case 'restart': serverRestart(); break;
				case 'stop': serverShutdown(); break;
				case 'debug': console.log(`Debug Status: ${console.toggleDebug()}`); break;
				case 'help': console.log(helpText); break;
				default: console.log(`Unknown command`);
			}
		});
	} catch (error) { console.error(`[ERROR] ${error}`); } //error.message
}

process.on('SIGTERM', serverTerminate); // Handle shutdown signals
process.on('SIGQUIT', serverShutdown);
process.on('SIGINT', serverShutdown);

function serverRestart() {
	server.close(() => { console.log(`${serverName} restarted`); }); // Close the server, trigger restart
}
function serverShutdown() { // Graceful shutdown function, forces shutdown if exit process fails
	console.log(`${serverName} stopped`);
    server.close(() => { process.exit(0); });
    setTimeout(() => { serverTerminate(); }, 2000); // Force shutdown if server hasn't stopped within 2s
}
function serverTerminate() {
	console.error(`${serverName} terminated`);
	process.exit(12);
}

serverRun(); // Start the async server function