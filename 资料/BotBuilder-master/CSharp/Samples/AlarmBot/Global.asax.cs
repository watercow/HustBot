﻿using Autofac;
using Autofac.Integration.WebApi;
using Microsoft.Bot.Builder.Dialogs.Internals;
using Microsoft.Bot.Sample.AlarmBot.Models;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Web.Http;

namespace Microsoft.Bot.Sample.AlarmBot
{
    public class Global : System.Web.HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            {
                // http://docs.autofac.org/en/latest/integration/webapi.html#quick-start
                var builder = new ContainerBuilder();

                // register the Bot Builder module
                builder.RegisterModule(new DialogModule());
                // register the alarm dependencies
                builder.RegisterModule(new AlarmModule());

                // Get your HttpConfiguration.
                var config = GlobalConfiguration.Configuration;

                // Register your Web API controllers.
                builder.RegisterApiControllers(Assembly.GetExecutingAssembly());

                // OPTIONAL: Register the Autofac filter provider.
                builder.RegisterWebApiFilterProvider(config);

                // Set the dependency resolver to be Autofac.
                var container = builder.Build();
                config.DependencyResolver = new AutofacWebApiDependencyResolver(container);
            }

            // WebApiConfig stuff
            GlobalConfiguration.Configure(config =>
            {
                config.MapHttpAttributeRoutes();

                config.Routes.MapHttpRoute(
                    name: "DefaultApi",
                    routeTemplate: "api/{controller}/{id}",
                    defaults: new { id = RouteParameter.Optional }
                );
            });
        }

        public static ILifetimeScope FindContainer()
        {
            var config = GlobalConfiguration.Configuration;
            var resolver = (AutofacWebApiDependencyResolver)config.DependencyResolver;
            return resolver.Container;
        }
    }
}