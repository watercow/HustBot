//用于get & post数据
var https = require('https');
var querystring = require('querystring');

module.exports = {
    executeWeatherSearch: function (query, callback) {
        this.loadData('/v5/weather?city=' + querystring.escape(query) + '&key=7592c29c347e4c97a921beb9d247b6ec', callback);
    },

    loadData: function (path, callback) {
        var options = {
            host: 'free-api.heweather.com',
            path: path,
            method: 'GET'
        }
        var profile;
        var request = https.request(options, function (response) {
            var data = '';
            response.on('data',function (chunk) { data += chunk; });
            response.on('end', function() {
                callback(JSON.parse(data));
            });
        });
        request.end();
    }
}
