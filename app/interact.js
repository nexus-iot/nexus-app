var client = require('socket.io-client');
const electron = require('electron');
const dialog = electron.dialog;

var network = null;
var actions = null;
var settings = null;

function transferFile(device) {
    var filenames = dialog.showOpenDialog({properties: ['openFile']});
    if (!filenames || filenames.length == 0) {
        return;
    }
    console.log(filenames[0]);
    var filename = filenames[0];

    var socket = client('http://'+device.privateIp+':'+network.port, {
        reconnection: false
    });

    var action = actions.ask(network.currentDevice.id, settings.get('name'), device, filename, []);
    socket.on('connect', function () {
        socket.emit('ask', action.description);
    });

    socket.on('connect_error', function (error) {
        console.log(error);
    });

    socket.on('connect_timeout', function () {
        console.log('timeout');
    })

    socket.on('ok', function () {
        action.state = 'enabled';
        socket.emit('lets-go');
    });

    socket.on('ko', function () {
        action.state = 'disabled';
    });

    socket.on('disconnect', function () {
        console.log('disconnection');
    });
}


module.exports = function (newNetwork, newActions, newSettings) {
    network = newNetwork;
    actions = newActions;
    settings = newSettings;

    return {
        transferFile: transferFile
    };
}
