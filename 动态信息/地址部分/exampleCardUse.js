var builder = require('botbuilder');

var thumbnail = new builder.ThumbnailCard(session);

thumbnail.images([builder.CardImage.create(session, profile.avatar_url)]);

var text = '';
if(profile.company) text += profile.company + '\n';
if(profile.email) text += profile.email + '\n';
if(profile.bio) text += profile.bio;

thumbnail.text(text);

thumbnail.tap(new builder.CardAction.openUrl(session, profile.html_url));