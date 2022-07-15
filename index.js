////SETUP////

const discord = require('discord.js')
const voiceDiscord = require('@discordjs/voice')
const ytdl = require('ytdl-core')
const yts = require('yt-search')
const { apiCall, createOptions } = require('./openai')
require('dotenv').config()
const client = new discord.Client(
    { intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] }
);
client.login(process.env.DISCORD_TOKEN)

////START////

//commands
const PREFIX = "!"
const playCmd = "playskin"
const pauseCmd = "pauseskin"
const unpauseCmd = "unpauseskin"
const skipCmd = "skipskin"
const rackyHelpCmd = "rackyhelp"
const playmeasong = "playmeasong"
const stopCmd = "stopskin"
const openaiCmd = "openai"
const greenText = "--greentext"
const eroticTale = "--erotictale"

//miscellaneous bullshit
const bannedPhrases = ["bibby", "bubby", "rackers sucks", "skan", "elon is not good", "get sick", "among us", "nick"]
const birdIsTheWordLink = "https://www.youtube.com/watch?v=9Gc4QTqslN4&ab_channel=VDJMikeyMike";
const tunukTun = "https://www.youtube.com/watch?v=vTIIMJ9tUc8&ab_channel=SonyMusicIndiaVEVO"
const openaiModel = "text-davinci-002"
const imagePrompts = ["giggy", "tucker"]

/** 
 * Checks for unacceptable messages in the chat and reprimands those who transgress.
*/
function checkBannedPhrases (msg){
	const lowerMessage = msg.content.toLowerCase()
	for(phrase of bannedPhrases){
		if (lowerMessage.includes(phrase)){
			msg.channel.send(`"${phrase}" is a banned phrase. Do NOT say it again.`)
		}
	}
}

function showImage(msg, prompt){
	msg.channel.send(`did somebody say...${prompt}?`)
	msg.channel.send({files: [{
			attachment: `assets/${prompt}.png`,
			name: `${prompt}.png`,
			description: "scan rito miss"
		}] 
	})
}

function handleQuickResponses(msg){
	const lowermessage = msg.content.toLowerCase()
	if (lowermessage.includes("fucked")){
		msg.channel.send("fucked GOOD");
		return;
	}
	for (thing of imagePrompts){
		if (lowermessage.includes(thing)){
			showImage(msg, thing)
		}
	}


	switch (lowermessage){
		case "stop":
			msg.channel.send("(start)")
			break;
		//more cases
		case lowermessage.includes("fucked"):
			msg.channel.send("fucked GOOD")
			break;
	}
}

/**
 * Upon receiving a rackyhelp request, give a list of valid commands 
 * they can use
 */
function handleRackyHelpRequest(msg){
	const rackyHelpString = "COMMAND LIST: \
							\n---------------------------------------------\
							\n!playskin - play the bix \
							\n!pauseskin - pause the bix \
							\n!unpauseskin - unpause the bix \
							\n!skipskin - skip the bix \
							\n---------------------------------------------\
							\n!openai - access the openai playground\
							\n           options: (--greentext, --eroticTale)\
							\n---------------------------------------------\
							\n\nOR MY PERSONAL FAVOURITE: \
							\n\n!playmeasong \n  "
	msg.channel.send(rackyHelpString)
}


async function search(searchString){
	const result = await yts(searchString)
	return result.all[0].url
}

function createConnection(voiceChannel, msg){
	const connection = voiceDiscord.joinVoiceChannel({
		channelId: voiceChannel.id,
		guildId: msg.guild.id,
		adapterCreator: msg.guild.voiceAdapterCreator,
	})
	return connection
}

function announceSongPlaying(channel, link){
	channel.send(`Playing: ${link}`)
}

/*
Object representing all the servers the bot is used in
Each object is of form:
	{
		serverName: "",
		queue: []
		dispatcher: __
	}

	where:
		-queue is an array of links
		-dispatcher is a callback function to play the song
*/
const servers = {}
let connection = null
const player = voiceDiscord.createAudioPlayer();
let playing = false;
let isPaused = false;

client.on('ready', function(){
	console.log('client is ready')
})


function play(connection, player, server){
	playing = true
	const resource = voiceDiscord.createAudioResource(ytdl(server.queue[0], {filter: 'audioonly'}))
	player.play(resource)
	connection.subscribe(player)
	//remove song just played from the queue
	server.queue.shift()

	player.on(voiceDiscord.AudioPlayerStatus.Idle, () => {
		playing = false
		skip(connection, player, server)
	})
}

function skip(connection, player, server){
	//song queued
	if (server.queue[0]){
		play(connection, player, server)
	}
	//queue empty
	else {
		connection.disconnect()
		playing = false
	}
}

function getTokens(string){
	const preTokens = string.substring(PREFIX.length).split(" ");
	let secondEl = ""
	for (i = 1; i < preTokens.length; i++){
		secondEl += preTokens[i] + " "
	}
	return [preTokens[0], secondEl]
}

client.on("messageCreate", async function(msg){
	//ensures the bot doesn't check for its own messages
	if (msg.author === client.user){
		return null
	}
	//checks for dissidents spreading dis-information
	checkBannedPhrases(msg)
	handleQuickResponses(msg);
	const voiceChannel = msg.member.voice.channel

	//add server if bot doesn't already have it added
	if (!servers[msg.guild.id]){
		servers[msg.guild.id] = {serverName: msg.guild.name, queue: []}
	}

	const server = servers[msg.guild.id]
	
	//implement play, pause, skip functionality
	if (msg.content.startsWith(PREFIX)){
		const tokens = getTokens(msg.content)
		const command = tokens[0]
		switch (command){
			case playCmd:
				if (!tokens[1]){
					msg.channel.send("WRITE IT CORRECTLY FUCK KNUCKEL")
					return
				}
				if (!voiceChannel){
					msg.reply("mmmmmmmget in the voice channel if you want to play the bot")
					return
				}

				//direct link
				if (tokens[1].startsWith("https://www.youtube.com/watch")){
					//add song to queue
					server.queue.push(tokens[1])
				}
				//search
				else { 
					const searchResult = await search(tokens[1])
					server.queue.push(searchResult)
					announceSongPlaying(msg.channel, searchResult)
				}

				//bot not connected (no song currently playing)
				if (!playing){
					connection = createConnection(voiceChannel, msg);
					play(connection, player, server)
				}
				break;

			case pauseCmd:
				player.pause()
				isPaused = true
				break;
			case unpauseCmd:
				player.unpause()
				isPaused = false;
				break;
			case skipCmd:
				skip(connection, player, servers[msg.guild.id]);
				break;
			case playmeasong:
				//
			case stopCmd:
				player.stop()
				//clear queue
				server.queue = []
				break;
			case openaiCmd:
				let prompt = tokens[1];

				//chosen greentext option
				if (tokens[1].startsWith(greenText)){
					const greenTextPrompt = "write a funny 4chan greentext about:\n"
					prompt = greenTextPrompt + tokens[1].substring(greenText.length + 1)
				}
				//chosen erotic option
				if (tokens[1].startsWith(eroticTale)){
					const eroticPrompt = "write an erotic tale about: \n"
					prompt = eroticPrompt + tokens[1].substring(greenText.length + 1)
				}
				//make actual API call
				const resultObject = await apiCall(createOptions(openaiModel, prompt))
				const completionString = resultObject.data.choices[0].text
				msg.channel.send(completionString)
				break;
			case rackyHelpCmd:
				handleRackyHelpRequest(msg)
				break;
			default:
				msg.channel.send(`WRONG COMMAND YOU MORON MOBILE \n\n type "!rackyhelp" for a list of commands`)
		}
	}
})
