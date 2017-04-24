/*-------------------Address Search---------------------
 *   模块名： 地址查询
 *   功能说明： 响应用户对地址相关的查询
 -------------------------------------------------------*/
 var builder = require('botbuilder');
var restify = require('restify');
var returnAddrMess = require('./returnAddrMess.js');
var querystring = require('querystring');
var https = require('https');

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

var dialog = new builder.IntentDialog();
dialog.matches(/^where/i,[

    function (session, result,next) {
        returnAddrMess.IPlocate(function (profiles) {
            var status = profiles.status;
            if (status != 0) {
                session.endDialog('You hide very well, we can not find you');
            }
            else {
                session.dialogData.property = null;
                //JSON解析
                var city_address = profiles.content.address;
                var point_x = profiles.content.point.x;
                var point_y = profiles.content.point.y; 
                next( { response: city_address } );
            }
        });
    },

    function (session, result) {
        session.endDialog( result.response );
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