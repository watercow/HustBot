
/*--------------------------LUIS_weatherbot--------------------------
 * 模块名                  : 带有自然语言处理的天气机器人
 * LUIS API接口            : 参见.env文件
 --------------------------------------------------------------------*/
var builder = require('botbuilder');
var restify = require('restify');
var https = require('https');
var pinyin = require('./ChineseToPinYin.js');
var querystring = require('querystring');
var returnWeather = require('./returnWeather.js');

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
 *   case 1               : 查询地方天气
 *   Default              : 其他功能intents
 *---------------------------------------------------------------*/ 
intents
    .matches('查询天气城市', builder.DialogAction.beginDialog('/SearchWeather'))
    .onDefault(builder.DialogAction.send("P90 rush B no stop!"));

/*-----------------------------查询地方天气----------------------------
 *   
 *   ASK                  : 告诉我今天武汉的天气
 *   ANSWER               : 热
 * 
 *   Ask                  : 今天冷吗
 *   Answer               : 默认分析华科所在城市的天气(武汉的天气)
 * 
 *-------------------------------------------------------------------*/
bot.dialog('/SearchWeather', [
    function (session, args, next) {
        session.dialogData.entities = args.entities;
        var searchAddr = builder.EntityRecognizer.findEntity(args.entities, '城市天气');
        if(searchAddr) {
            //var PinAddr = pinyin.codefans_net_CC2PY(query.entity);
            next( { response: searchAddr.entity } );
        }
        else {
            next( { response: 'wuhan' } );
        }
    },

    function (session, result, next) {
        var query = result.response;
        if (!query) {
            session.endDialog('大哥，怎么取消查询了？');
        }
        else {
            returnWeather.executeWeatherSearch(query, function(profiles) {
                var status = profiles.HeWeather5[0].status;
                if (status != 'ok') {
                    session.endDialog('您可能输入了一个火星城市');
                }
                else {
                    session.dialogData.property = null;
                    //JSON解析
                    var weatherstatus = profiles.HeWeather5[0].daily_forecast[0].cond.txt_d;
                    var temperature = profiles.HeWeather5[0].now.tmp;
                    var suggestion = profiles.HeWeather5[0].suggestion.sport.txt;
                    next( { response: weatherstatus + ' ! 当前有' + temperature + '度 ' + suggestion } );
                }
            });
        }
    },

    function (session, result) {
        session.endDialog( result.response );
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