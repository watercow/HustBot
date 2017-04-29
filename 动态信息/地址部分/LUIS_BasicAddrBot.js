/*-------------------Address Search---------------------
 *   模块名： 地址查询
 *   功能说明： 响应用户对地址相关的查询
 -------------------------------------------------------*/
var builder = require('botbuilder');
var restify = require('restify');
var returnAddrMess = require('./returnAddrMess.js');
var querystring = require('querystring');
var https = require('https');

var model = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/d96b9729-62e1-490b-89a5-e7129ef24469?subscription-key=ec9965d2ce584a618c6fd020c9a28047&timezoneOffset=0.0&verbose=true&q=";
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog( {recognizers: [recognizer]} );

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

/*------------------------main dialog------------------------------
 *  Use intents to confirm what kind of service the user wants.
 *-----------------------------------------------------------------*/
bot.dialog('/', intents);

/*----------------------intents content--------------------------
 *   case 1               : 定位当前位置
 *   Default              : 其他功能intents
 *---------------------------------------------------------------*/ 
intents
    .matches('查询位置', builder.DialogAction.beginDialog('/findLocation'))
    .matches('查询路线', builder.DialogAction.beginDialog('/GiveWayLine'))
    .onDefault(builder.DialogAction.send("P90 rush B no stop!"));


/*-----------------------------定位当前位置----------------------------
 *   
 *   ASK                  : 这是哪
 *   ANSWER               : 返回一张HeroCard
 * 
 *-------------------------------------------------------------------*/
bot.dialog('/findLocation',[
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

    function (session, result) {
        var url = "https://api.map.baidu.com/staticimage/v2?ak=QqSNQqKLINcvupZx3je473WFFCHU7eLo&mcode=666666&center="+ result.response.point_x + "," + result.response.point_y +"&width=300&height=200&zoom=11";
        var message = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title(result.response.city_address)
                    .subtitle("Location")
                    .text("2333")
                    .images([
                        builder.CardImage.create(session, url)
                    ])
                    .tap(builder.CardAction.openUrl(session, url))
            ]);
        session.endDialog(message);
    }
]);


/*-----------------------------给出路线----------------------------
 *   
 *   ASK                  : 从华科到武大怎么走
 *   ANSWER               : 返回一张路线图的HeroCard
 * 
 *-----------------------------------------------------------------*/
bot.dialog('/GiveWayLine',[
    function (session, args, next) {
        session.dialogData.entities = args.entities;
        var fromAddr = builder.EntityRecognizer.findEntity(args.entities, '出发地');
        var toAddr = builder.EntityRecognizer.findEntity(args.entites, '目的地');
        var origin = fromAddr.entity;
        var destination = toAddr.entity;
        if(fromAddr && toAddr) {
            next( { origin, destination } );
        }
        else {
            session.endDialog("请准确输入起始地点和目的地");
        }
    },
    function(session, result, next) {
        /* 返回出发地和目的地的坐标 */
        returnAddrMess.GeocodingAPI()
    }
]); 


/*-----------Open Server-----------------------
 *   链接bot emulator 的基本操作设置
 *---------------------------------------------*/
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());