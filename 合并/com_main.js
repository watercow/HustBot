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
        新增 询问用户是否要修改 ID 的功能
        新增 自动匹配用户输入的 login 字符串从而进入"登录对话"的功能
    @ 2017-04-11 更新：
        新增 LUIS 的自动匹配功能
        新增 course 的匹配功能
        新增 根据 session.userData.userName 找到 course.json 中用户序号的功能
        计划 添加 如果用户不存在于 course.json中，就给其在 user[] 中新增一项
    @ 2017-04-12 更新：
        新增 如果用户不存在于 course.json中，就给其在 user[] 中新增一项 的功能
    @ 2017-04-13 更新：
        新增 comfort, 用随机的回答安慰用户
        新增 joke, 随机回应一个笑话
        新增 laugh, 大笑
------------------------------------------------------------------------------*/

// create builder, connector and bot
var builder = require('botbuilder');
var connector = new builder.ChatConnector({
            appId: "860c91b4-cdab-4861-80b0-e95ac005030e",
            appPassword:   "4xkrXKpTrguazTSwHsPyfkB"
        });
var bot = new builder.UniversalBot(connector);

// -- require
var https = require('https');
var querystring = require('querystring');
var returnWeather = require('./returnWeather.js');

// create server
var restify = require('restify');
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());

// create intents and model
var model = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/487b015c-ce71-4935-bf9a-0faab9769543?subscription-key=480f19ea534643c7a0d6adda4ca17539&timezoneOffset=0.0&verbose=true&q=";
var recongizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({recognizers: [recongizer]});

// write and read the .json file
var UserInfo = require('./UserInfo.json');
var fs = require("fs");
var course = require('./course.json');

/* ----------------------- main dialog -----------------------
 * Use intents to confirm what kind of service the user wants.
 * ----------------------------------------------------------- */ 
bot.dialog('/', intents);

/* ------------------------- intents -------------------------
 * Case /^login/i   : begin '/login' dialog
 * Default          : say 'Hello!'
 * ----------------------------------------------------------- */ 
intents.matches('login', builder.DialogAction.beginDialog('/login'))
    .matches('course', builder.DialogAction.beginDialog('/course'))
    .matches('comfort', builder.DialogAction.beginDialog('/comfort'))
    .matches('joke', builder.DialogAction.beginDialog('/joke'))
    .matches('weather', builder.DialogAction.beginDialog('/SearchWeather'))
    .matches('canteen', builder.DialogAction.send("test: canteen"))
    .matches('building', builder.DialogAction.send("test: building"))
    .matches('laugh', builder.DialogAction.send("test: laugh"))
    .matches('location', builder.DialogAction.send("test: location"))
    .matches('route', builder.DialogAction.send("test: route"))
    .matches('time', builder.DialogAction.send("test: time"))
    .onDefault(builder.DialogAction.send("Hello!"));

/* ----------------------- login dialog -----------------------
 * Step 1 : Ask the user's name
 * Step 2 : Use '/userLogin' to judge if the user exists
 * Step 3 : If exists :
 *              Say hello and return
 *          Else :
 *              Use '/completeInfo' to ask user if he wants to
 *              complete information or not
 * Step 4 : If user wants to complete information :
 *              Use '/completeID' to add more infomation
 *          Else :
 *              Add the user's name to .JSON file and return
 * ----------------------------------------------------------- */ 
bot.dialog('/login', [
    function (session) {
        builder.Prompts.text(session, 'Now logining ... Who are you, my friend ?');
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
        builder.Prompts.confirm(session, "Do you want to add more information like ID or courses , " + args + ' ?');
    },
    function (session, results) {
        var flag;
        if (results.response) {         // judge if user want to add more information
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

        session.send("OK, I finished it.");
        session.endDialog();
    }
]);

/* -------------- course dialog --------------
 * Show the curent user's courses
 * ----------------------------------------------- */
bot.dialog('/course', [
    function (session) {
        builder.Prompts.choice(session, 'What kind of service about class do you want ?', "Look today\'s class|Look tomorrow\'s class|Edit my class|Quit"); 
    },
    function (session, results) {
        switch (results.response.index) {
            case 0 :
                session.beginDialog('/courseList', 0);
                break;
            case 1 :
                session.beginDialog('/courseList', 1);
                break;
            case 2 :
                session.beginDialog('/courseEdit');
                break;
            case 3 :
                session.send('OK, quit now');
                session.endDialog();
                break;
        }
    }
]);

/* -------------- courseList dialog ----------------
 * Show the curent user's courses today or tomorrow
 * ------------------------------------------------- */
bot.dialog('/courseList', [
    function (session, args) {
        // get the day which user wants to know
        var day  = new Date().getDay();
        day = (day + args)%7;
        
        // read the .JSON file
        var currentUser = session.userData.userName;
        
        // get the index of user in 'course.json'
        var i = 0;
        for (i = 0;i < course.user.length; i++) {
            if (course.user[i].name == currentUser) {
                break;
            }
            if (i == course.user.length - 1) {
                break;
            }
        }
        session.userData.userIndex = i;     // save the index of user

        var str = JSON.stringify(course.user[i].class[day]);
        session.send("Get it! Here they are :\n" + str);

        // confirm if user wants to continue do something about course
        builder.Prompts.confirm(session, "Would do you like to know or edit more about your class?");
    },
    function (session, results) {
        if (results.response) {
            session.replaceDialog('/course');
        } else {
            session.endDialog("OK, quit now.");
        }
    }
]);


/* -------------- courseEdit dialog --------------
 * Edit the curent user's courses
 * ----------------------------------------------- */
bot .dialog ('/courseEdit', [
    function (session) {
        session.send("Now you can edit your class for a week.");
        builder.Prompts.choice(session, "Which day would you like to edit?", 'Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Quit Edit');
    },
    function (session, results) {
        // get the day which user wants to edit
        session.dialogData.day = results.response.index;

        builder.Prompts.text(session, "Please tell me your new class at this day below.");
    },
    function (session, results) {
        var currentUser = session.userData.userName;
        
        // find the current user's index in 'course.json'
        var i = 0;
        for (i = 0;i < course.user.length; i++) {
            if (course.user[i].name == currentUser) {
                session.dialogData.exist = true;
                break;
            }
            if (i == course.user.length - 1) {
                session.dialogData.exist = false;
                break;
            }
        }
        session.userData.userIndex = i;     // save the index of user

        // start to edit class of 'day'
        console.log(results.response);
        if (session.dialogData.exist) {       // if the user exists
            eval("course.user[" + session.userData.userIndex + "].class[" + session.dialogData.day + "]=\"" + results.response + "\"");
        } else {                            // eles if the user dosen't exist, push it back
            eval("course.user.push({\"name\":\"" + session.userData.userName + "\",\"class\":[\"nothing\",\"nothing\",\"nothing\",\"nothing\",\"nothing\",\"nothing\",\"nothing\"]})");
            eval("course.user[" + session.userData.userIndex + "+1].class[" + session.dialogData.day + "]=\"" + results.response + "\"");
        }
        var str = JSON.stringify(course);
        fs.writeFileSync('./course.json', str);

        session.send("OK, I finished it.");

        // confirm if user wants to continue do something about course
        builder.Prompts.confirm(session, "Would do you like to know or edit more about your class?");
    },
    function (session, results) {
        if (results.response) {
            session.replaceDialog('/course');
        } else {
            session.endDialog("OK, quit now.");
        }
    }
]);

/* -------------- comfort dialog --------------
 * to comfort the user by random words
 * ----------------------------------------------- */
bot.dialog('/comfort', function (session) {
    var index = Math.floor(Math.random() * 11);
    var comfortRepeat = [
        "Oh, I wish I could sweep you tears and kiss on your forehead.",
        "My dear, I wish if I could give a hug to you.",
        "It's so terrible, maybe listening a music could let you feel better.",
        "Just be relax. Although we are separated by the glass, I can fell your broken heart.",
        "Granted that your dear ones all desappear, I am still here with you.",
        "Life is a boat, I believe that you will meet the best one someday.",
        "Someone who always bawls you out might be the one loves you most.",
        "Forget it my dear. Once the sun goes down, the moon will rises up on time.",
        "Whatever happens, you shouldn't lose your confidence my lord",
        "I wish I have blood and heart like you, and then lend you my shoulder."
    ];

    session.endDialog(comfortRepeat[index]);
});


/* -------------- joke dialog --------------
 * tell user a joke at random
 * ----------------------------------------------- */
bot.dialog('/joke', function (session) {
    var index = Math.floor(Math.random() * 2);
    var jokeRepeat = [
        "There are 10 kinds of people in the world.\nOne knows binary, but another doesn't know it.",
        "The wife had an accident and was dying.\nHearing that, the husband hurried to hospital, hold wife's hands tightly and started to twitch.\nThe wife begged husband, \"Can you ... promise me ... one thing ... ?\"\n\"Whatever you say, I will promise.\", said the husband.\nAnd then wife said, \"Could you pelase don\'t laugh so happily ?\" ."
    ];

    session.endDialog(jokeRepeat[index]);
});


// -- part 2
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
