var https = require('https');
var querystring = require('querystring');

module.exports = {
    executeSearch: function (query, callback) {
        this.loadData('url',callback);
    },

    loadData: function (path, callback) {
        var options = {
            host: 'uri',
            path: path,
            method: 'GET'
        }
        var profile;
        var request = https.request(options, function (response) {
            var data = '';
            response.on('data', function (chunk) { data += chunk; });
            response.on('end', function() {
                callback(JSON.parse(data));
            });
        });
        request.end();
    }
}