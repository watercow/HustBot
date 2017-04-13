var builder = require('botbuilder');
var restify = require('restify');

module.exports = {
    start: function () {
        var server = restify.createServer();
        server.listen(process.env.port || process.env.PORT || 3978, function (){
            console.log("listening");
        });

        var connector = new builder.ChatConnector({
            appId: "860c91b4-cdab-4861-80b0-e95ac005030e",
            appPassword:   "4xkrXKpTrguazTSwHsPyfkB"
        });

        var bot = new builder.UniversalBot(connector);
        server.post('/api/messages', connector.listen());

        // create intents and model
        var model = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b24d941d-f8d9-43fe-8eac-a79c7a71ad36?subscription-key=480f19ea534643c7a0d6adda4ca17539&timezoneOffset=8.0&verbose=true&spellCheck=true&q=";
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
    }
}