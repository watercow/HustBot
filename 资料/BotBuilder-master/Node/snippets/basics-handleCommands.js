// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
    var msg = session.message;
    if (/^help/i.test(msg.text || '')) {
        // Send user help message
        session.send("I'll repeat back anything you say or send.");
    } else if (msg.attachments && msg.attachments.length > 0) {
        // Echo back attachment
        session.send({
            text: "You sent:",
            attachments: [
                msg.attachments[0]
            ]
        });
    } else {
        // Echo back uesrs text
        session.send("You said: %s", session.message.text);
    }
});
