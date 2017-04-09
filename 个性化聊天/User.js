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

    @ 2017-04-09 更新：
        新增了询问用户是否要修改 ID 的功能
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
    function (session, results) {
        session.userData.userName = results.response;
        session.beginDialog('/userLogin', results.response);
    },
    function (session, results) {
        if (results.response == 'NotExist') {
            session.beginDialog('/completeInfo', session.userData.userName);
        } else if (results.response == 'Exist') {
            session.endDialog();
        }
    },
    function (session, results) {
        // session.send("Debug response : " + results.response);
        if (results.response == 'Y') {
            // session.send("Debug: Y");
            session.beginDialog('./completeID', session.userData.userName);
        } else if (results.response == 'N') {
            // session.send("Debug: N");
            var str = JSON.stringify(UserInfo);
            fs.writeFileSync('./UserInfo.json', str);
        }
    }
]);

/* -------------- userLogin dialog --------------
 * If the userName exists, return 'Exist'
 * Else return 'NotExist'
 * ---------------------------------------------- */
bot.dialog('/userLogin', [
    function (session, args, next) {
        session.dialogData.userName = args;     // 'args' is 'result.response' passed by main dialog
        if (UserInfo.hasOwnProperty(args)) {    // if current user exists
            session.send("Hello " + args + "!");
            session.endDialogWithResult({response : "Exist"})
        } else {                                // current user doesn't exist
            session.send(session.dialogData.userName + " , I am initialing your information ...")

            // use  eval("xxx.xx" + "=" + "x");  to add properties 
            eval("UserInfo." + session.dialogData.userName + "=" + " { \"name\" : \"" + session.dialogData.userName + "\" } ");

            session.endDialogWithResult({response : "NotExist"});
        }
    }
]);

/* -------------- completeInfo dialog --------------
 * Ask if the user want to add moer information
 *     If 'yes', return 'Y'
 *     Else return 'N'
 * ------------------------------------------------- */
bot.dialog('/completeInfo', [
    function (session, args) {
        builder.Prompts.text(session, "Do you want to add more information like ID or courses , " + args + ' ?');
    },
    function (session, results) {
        var flag;
        if (results.response == 'yes') {        // judge if user want to add more information
            flag = 'Y';
        } else {
            flag = 'N';
        }
        session.endDialogWithResult({response : flag});
    }
]);

/* -------------- completeID dialog --------------
 * Ask for the user's ID and save it
 * The .JSON file will be changed
 * No return
 * ----------------------------------------------- */
bot.dialog('./completeID',[
    function (session, args) {
        session.dialogData.userName = args;
        builder.Prompts.text(session, "Tell me your ID please .");  // Prompt the question
    },
    function (session, results) {
        // use eval() to add a new property for 'UserInfo'
        eval("UserInfo." + session.dialogData.userName + ".ID=\"" + results.response + "\"");

        var str = JSON.stringify(UserInfo);     // resave the UserInfo.JSON file
        fs.writeFileSync('./UserInfo.json', str);

        session.send("OK, I finished it .");
        session.endDialog();
    }
]);
