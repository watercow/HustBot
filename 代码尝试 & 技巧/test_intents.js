var builder = require('botbuilder');

var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();

bot.dialog('/', [
    function (session) {
        session.send("Hello");
        session.beginDialog('/test');
    },
    function (session) {
        session.beginDialog('/intents');
    }
]);

bot.dialog('/test', [
    function (session) {
        builder.Prompts.text(session, "Qusetion 1 ?");
    },
    function (session, results) {
        builder.Prompts.text(session, "Qusetion 2 ?");
    },
    function (session, results) {
        builder.Prompts.text(session, "Question 3 ?");
    }
]);

bot.dialog('/intents', intents);

intents.matches(/^add/i, builder.DialogAction.send('/addTask'))
    .matches(/^change/i, builder.DialogAction.send('/changeTask'))
    .matches(/^delete/i, builder.DialogAction.send('/deleteTask'))
    .onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));