
/*-----------------Weather Search-----------------------------
 *   模块名: 天气查询模块
 *   功能说明：用于在用户输入如“查询天气”时返还天气信息
-------------------------------------------------------------*/
var builder = require('botbuilder');
var restify = require('restify');

var returnWeather = require('./returnWeather.js');

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

var dialog = new builder.IntentDialog();
dialog.matches(/^search/i , [
    function (session, args, next) {
        if (session.message.text.toLowerCase() == 'search') {
            //提醒用户要search for what??
            builder.Prompts.text(session, '您要查询哪里的天气?');
        }
        else {
            var query = session.message.text.substring(7);
            next( { response: query } );
        }
    },

    function (session, result, next) {
        var query = result.response;
        if (!query) {
            session.endDialog('大哥，怎么取消查询了？');
        }
        else {
            returnWeather.executeWeatherSearch(query, function(profiles) {
                var status = profiles.HeWeather5.status;
                if (status == 'unknown city') {
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

    function (session, result, next) {
        session.send( result.response );
    }
]);


bot.dialog('/',dialog);

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());


