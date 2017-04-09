﻿using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Http;

using Autofac;
using Microsoft.Bot.Builder.ConnectorEx;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Dialogs.Internals;
using Microsoft.Bot.Connector;

namespace Microsoft.Bot.Sample.SimpleFacebookAuthBot.Controllers
{
    public class OAuthCallbackController : ApiController
    {
        /// <summary>
        /// OAuth call back that is called by Facebook. Read https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow for more details.
        /// </summary>
        /// <param name="userId"> The Id for the user that is getting authenticated.</param>
        /// <param name="conversationId"> The Id of the conversation.</param>
        /// <param name="code"> The Authentication code returned by Facebook.</param>
        /// <param name="state"> The state returned by Facebook.</param>
        /// <returns></returns>
        [HttpGet]
        [Route("api/OAuthCallback")]
        public async Task<HttpResponseMessage> OAuthCallback([FromUri] string userId, [FromUri] string botId, [FromUri] string conversationId, [FromUri] string channelId, [FromUri] string serviceUrl, [FromUri] string code, [FromUri] string state, CancellationToken token)
        {
            // Get the resumption cookie
            var address = new Address
                (
                    // purposefully using named arguments because these all have the same type
                    botId: FacebookHelpers.TokenDecoder(botId),
                    channelId: channelId,
                    userId: FacebookHelpers.TokenDecoder(userId),
                    conversationId: FacebookHelpers.TokenDecoder(conversationId),
                    serviceUrl: FacebookHelpers.TokenDecoder(serviceUrl)
                );
            var conversationReference = address.ToConversationReference();

            // Exchange the Facebook Auth code with Access token
            var accessToken = await FacebookHelpers.ExchangeCodeForAccessToken(conversationReference, code, SimpleFacebookAuthDialog.FacebookOauthCallback.ToString());

            // Create the message that is send to conversation to resume the login flow
            var msg = conversationReference.GetPostToBotMessage();
            msg.Text = $"token:{accessToken.AccessToken}";

            // Resume the conversation to SimpleFacebookAuthDialog
            await Conversation.ResumeAsync(conversationReference, msg);

            using (var scope = DialogModule.BeginLifetimeScope(Conversation.Container, msg))
            {
                var dataBag = scope.Resolve<IBotData>();
                await dataBag.LoadAsync(token);
                ConversationReference pending;
                if (dataBag.PrivateConversationData.TryGetValue("persistedCookie", out pending))
                {
                    // remove persisted cookie
                    dataBag.PrivateConversationData.RemoveValue("persistedCookie");
                    await dataBag.FlushAsync(token);
                    return Request.CreateResponse("You are now logged in! Continue talking to the bot.");
                }
                else
                {
                    // Callback is called with no pending message as a result the login flow cannot be resumed.
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, new InvalidOperationException("Cannot resume!"));
                }
            }
        }
    }
}
