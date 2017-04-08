/*-----------------------------------------------------------------------------
    这个机器人可以用来记录用户的名字，并把用户的信息保存在同一目录下的 UserInfo.json
文件中。

    主对话包括两个瀑布流，第一个询问用户的名字，第二个调用 /userLoging 对话。
    /userLogin 对话也包括两个瀑布流，第一个用来确认 JSON 文件中是否包含这名用户，如果
包含这个用户，则向用户问好并且返回；如果不包含这个用户，则根据用户先前的回答更新 JSON 
文件。

    更新 JSON 文件的步骤：
        #1  将 JSON 文件转化为 JavaScript 对象
        #2  给 JavaScript 对象添加、修改、删除属性
        #3  将修改后的 JavaScript 对象转化为一个字符串
        #4  使用 fs 文件操作，把字符串写入 JSON 文件

    使用方式：
        说：  hello
        说：  yuange 或者 lubin 或者 其他未在 JSON 文件中存在的名字
------------------------------------------------------------------------------*/

// create builder, connector and bot
var builder = require('botbuilder');
var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);

// write and read the .json file
var UserInfo = require('./UserInfo.json');
var fs = require("fs");

// main dialog
bot.dialog('/', [
    function (session) {
        builder.Prompts.text(session, 'Who are you, my friend ?');
    },
    function (session, result) {
        session.beginDialog('/userLogin', result.response);
    }
]);

// userLogin dialog
bot.dialog('/userLogin', [
    function (session, args, next) {
        session.dialogData.userName = args;     // 'args' is 'result.response' passed by main dialog
        if (UserInfo.hasOwnProperty(args)) {    // if current user exists
            var str = "Hello ! " + args;
            session.endDialog(str);
        } else {                                // current user doesn't exist
            next();
        }
    },
    function (session, result) {                // add userInformation
        session.send("I am initialing your information ...")

        // use  eval("xxx.xx" + "=" + "x");  to add properties 
        eval("UserInfo." + session.dialogData.userName + "=" + " { \"name\" : \"" + session.dialogData.userName + "\" } ");
        var str = JSON.stringify(UserInfo);
        fs.writeFile('./UserInfo.json', str);
        
        session.endDialog("Initial success !");
    }
]);