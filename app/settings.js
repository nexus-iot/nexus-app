var fs = require('fs');
var settings = {};

var settingsFilename = __dirname + '/../tmp/settings.json';

function load (callback) {
    fs.readFile(settingsFilename, 'utf8', function (err, content) {
        if (err) {
            callback && callback(err);
        } else {
            settings = JSON.parse(content);
            callback && callback();
        }
    });
}

function get (key) {
    return settings[key];
}

function set (key, value) {
    settings[key] = value;
}

function save (callback) {
    fs.writeFile(settingsFilename, JSON.stringify(settings), function (err) {
        callback && callback(err);
    });
}

module.exports = {
    get:get,
    set:set,
    save:save,
    load:load
};
