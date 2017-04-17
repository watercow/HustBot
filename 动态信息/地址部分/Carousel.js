var builder = require('botbuilder');
var restify = require('restify');
var githubClient = require('.github-client.js');

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

var dialog = new builder.IntentDialog();
dialog.matches(/^search/i,[
    function (session, args, next) {
        if(session.message.text.toLocaleLowerCase() == 'search') {
            builder.Prompts.text(session, 'Who do you want to search for');
        }
        else {
            var query = session.message.text.substring(7);
            next({ response: query });
        }
    },
    function (session, result, next) {
        var query = result.response;
        if(!query) {
            session.endDialog('Request cancelled');
        }
        else {
            githubClient.executeSearch(query, function (profiles) {
                var totalCount = profiles.total_count;
                if(totalCount == 0) {
                    session.endDialog('Sorry, no result found');
                }
                else if(totalCount > 10) {
                    session.endDialog('More than 10 results were found');
                }
                else {
                    session.dialogData.property = null;
                    var cards = profiles.items.map(function(item) {return createCard(session, item)} );;
                    var message = new buildler.Message(session).attachments(cards).attachmentLayout('carousel');
                    session.send(message);
                }
            });
        }
    }
]);


bot.dialog('/',dialog);

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());

function createCard(session, profile) {
    var card = new builder.ThumbnailCard(session);

    card.title(profile.login);
    card.images([builder.CardImage.create(session, profile.avatar_url)]);
    card.tap(new builder.CardAction.openUrl(session, profile.html_url));

    return card;
}