const notifier = require('node-notifier');


function notify (title, message) {
    notifier.notify({
        'title': title,
        'message': message
    });
}


module.exports = notify;
