var querystring = require('querystring');
var https = require('https');

module.exports = {
    /*------------------------------------------
     *  模块一        ：根据IP返回地址信息
     *  参数说明      ：入参默认本机IP
     *               ： 出参为可用于百度地图显示的
     *                  x,y坐标 
     *-------------------------------------------*/
    IPlocate: function (callback) {
        this.loadData('/location/ip?ak=QqSNQqKLINcvupZx3je473WFFCHU7eLo&coor=bd09ll', callback);
    },

    GeocodingAPI: function (query, callback) {
        this.loadData('/geocoder/v2/?address=' + querystring.escape(query)
                     + '&output=json&ak=QqSNQqKLINcvupZx3je473WFFCHU7eLo&coor=bd09ll&callback=showLocation', callback);
    },

    loadData: function (path, callback) {
        var options = {
            host: 'api.map.baidu.com',
            path: path,
            method: 'GET'
        };
        var profile;
        var request = https.request(options,function (response) {
            var data = '';
            response.on('data', function (chunk) {data += chunk;} );
            response.on('end', function () {
                callback(JSON.parse(data));
            });
        });
        request.end();
    }
}