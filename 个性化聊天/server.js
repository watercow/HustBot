var builder = require('botbuilder');
var http = require('https');
var restify = require('restify');

var dotenv = require('dotenv');
dotenv.load();

var Connector = require('./connector');

var connector = Connector.start();