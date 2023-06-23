const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();
const configuration = new Configuration({
	apiKey: process.env.OPENAI_TOKEN,
  });
const openai = new OpenAIApi(configuration);

function createOptions(model, prompt, max_tokens = 2000, temperature = 1, echo = false){
	return {
		model: model,
		prompt: prompt, 
		max_tokens: max_tokens,
		temperature: temperature, 
		echo: echo
	}
}

async function apiCall(options){
	const response = await openai.createCompletion(
		options
	)
	return response
}

// async function test(){
// 	const result = await apiCall(createOptions("text-davinci-002", "write a funny 4chan post \n >be me, two VHC copies of good fellas"))
// 	console.log(result.data)
// }

module.exports = {
	apiCall,
	createOptions
}

