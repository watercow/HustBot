var builder = require('botbuilder');
var restify = require('restify');

//将请求传递给服务端
//var https = require('https');
//var querystring = require('querystring');

var returnWeather = require('./returnWeather.js');

//var model = process.env.LUIS_MODEL;
//var recognizer = new builder.LuisRecognizer(model);
//var dialog = new builder.IntentDialog( {recognizers: [recognizer]} );



// module.exports = dialog
//     .matches('LoadProfile',[
//         confirmUsername, getProfile
//     ])
//     .matches('SearchProfile',[
//         confirmQuery, searchProfiles, getProfile
//     ])
//     .matches('查询天气',[
//         confirmQueryAddr, searchAddrWeather, getAddrWeather
//     ])
//     .onDefault([sendInstructions, redirectConversation]);


// //瀑布流询问查询天气
// function confirmQueryAddr(session, args, next) {

//     session.dialogData.entities = args.entities;
//     var query  = builder.EntityRecognizer.findEntity(args.entities, '天气');

//     if(query){
//         next( { response: query.entity } );
//     }
//     else{
//         builder.Prompts.text(session, "sorry，没听清，您要查询哪里的天气？");
//     }
// }

// //瀑布流在用户输入中找出要查询的地址
// function searchAddrWeather(session, results, next) {
//     var query = session.dialogData.query = results.response;
//     if( !query ) {
//         session.endDialog('Request cancelled');
//     }
//     else{
//         //查询天气API接口的使用

//         //github API接口的使用
//         executeSearch(query , function (profiles) {
//             var totalCount = profiles.total_count;
//             if(totalCount == 0){
//                 session.endDialog('Sorry, no results found');
//             }
//             else if(totalCount > 10) {
//                 session.endDialog('More than 10 results found, please more detail');
//             }
//             else {
//                 session.dialogData.property = null;
//                 var thumbnails = profiles.items.map();
//                 var message = new builder.Message(session).attachments(thumbnails);
//                 session.send(message);
//             }
//         });
//     }
// }

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
                    var weather = profiles.HeWeather5[0].daily_forecast[0].cond.txt_d;
                    // 老哥，forecast把t打成了e <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<!!!
                    // 23333
                    next( { response: weather } );
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


