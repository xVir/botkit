/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
          \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
           \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit is has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');
var apiai = require('apiai');
var uuid = require('node-uuid');
var Entities = require('html-entities').XmlEntities;
var decoder = new Entities();

var apiAiService = apiai('bb3039d2907b4e238bc82c63b7bebbb2','6b5639dd-ffb8-4e21-8519-a2594dafc70e');

var sessionIds = {};

var controller = Botkit.slackbot({
    debug: false,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM(function(err) {

    if (err) {
        console.log('** RTM ERROR: ',err);
    }
});

// Example receive middleware with API.AI processing
controller.middleware.receive.use(function(bot, message, next) {

    console.log('Receive middleware! ', message.type, 'for ', bot.identity.name);

    if (message.type == 'message' && message.text)
    {
        if (message.user == bot.identity.id) {
            // message from bot can be skipped
            next();
        }
        else if (message.text.indexOf("<@U") == 0) {
            // skip other users direct mentions
            next();
        }
        else {
            var requestText = decoder.decode(message.text);

            var channel = message.channel;
            if (!(channel in sessionIds)) {
                sessionIds[channel] = uuid.v1();
            }

            var request = apiAiService.textRequest(requestText,
                {
                    sessionId: sessionIds[channel]
                });

            request.on('response', function (response) {
                console.log('api.ai response', JSON.stringify(response));

                if (response.result) {
                    if (response.result.fulfillment) {
                        message.apiaiSpeech = response.result.fulfillment.speech;
                    }

                    if (response.result.action) {
                        message.apiaiAction = response.result.action;
                    }
                }

                next();
            });

            request.on('error', function (error) {
                console.log(error);
                next();
            });

            request.end();
        }
    }
    else
    {
        next();
    }

});

controller.hears(['.*'], ['direct_message', 'direct_mention', 'mention', 'ambient'], function (bot, message) {
    if (message.type == 'message') {

        console.log('Api.ai result ', message.apiaiSpeech, ' ' , message.apiaiAction);

        if (message.apiaiSpeech) {
            bot.reply(message, message.apiaiSpeech);
        }

    }

});
