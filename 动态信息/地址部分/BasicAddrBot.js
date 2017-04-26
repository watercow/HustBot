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

    function (session, result, next) {
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
                next( { response: {city_address, point_x, point_y} });
            }
        });
    },

    function (session, result, next ) {
        var cards = createLocateCard(session, result.response);
        var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');
        session.send(message);
        //session.endDialog( result.response.city_address );
    }
]);


bot.dialog('/',dialog);

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());

function createLocateCard(session, profile) {
    var card = new builder.ThumbnailCard(session);

    card.title(profile.city_address);
    //card.images([builder.CardImage.create(session, 'api.map.baidu.com/staticimage/v2?ak=QqSNQqKLINcvupZx3je473WFFCHU7eLo&mcode=666666&center='  + profile.point_x +',' + profile.point_y  + '&width=300&height=200&zoom=11')]);
    var url = "https://api.map.baidu.com/staticimage/v2?ak=QqSNQqKLINcvupZx3je473WFFCHU7eLo&mcode=666666&center=116.403874,39.914888&width=30&height=20&zoom=11";
    card.images([builder.CardImage.create(session, url)]);
    return card;
}