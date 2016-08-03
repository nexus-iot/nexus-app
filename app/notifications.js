const notifier = require('node-notifier');

var icon = require('./icon');

function notify (title, message) {
    notifier.notify({
        'title': title,
        'icon': icon.filename,
        'message': message
    });
}


module.exports = notify;
