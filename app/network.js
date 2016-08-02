var EventEmitter = require('events');
var util = require('util');

var apiKey = "880eaa008f725db601350115c2b7943d6b94fc2dfb9fe70b5440fe6be4abc116";

var device = require('nexus.io').device;
var devices = [];

function Network () {

    EventEmitter.call(this);
    var Network = this;

    this.currentDevice = device;
    this.devices = [];
    this.port = 8888;
    this.currentDevice.isRegistered = false;

    this.currentDevice.on('registered', function (newDevice) {
        Network.currentDevice.isRegistered = true;
        //console.log('registered', newDevice);

        device.detect();
        Network.emit('state-changed');
    });

    this.currentDevice.on('unregistered', function () {
        Network.currentDevice.isRegistered = false;
        Network.devices = [];
        Network.emit('state-changed');
    });

    this.currentDevice.on('devices', function (newDevices) {
        //console.log('devices');
        //console.log(newDevices);
        Network.devices = newDevices;
        Network.emit('state-changed');
    });

    this.currentDevice.on('device-joined', function (newDevice) {
        //console.log('device-joined');
        //console.log(newDevice);
        Network.devices.push(newDevice);
        Network.emit('state-changed');
    });

    this.currentDevice.on('device-leaved', function (oldDevice) {
        //console.log('device-leaved');
        //console.log(oldDevice);
        var index = 0;
        for(var i = 0 ;  i < Network.devices.length ; i++) {
            if (oldDevice.id == Network.devices[i].id) {
                index = i;
            }
        }
        Network.devices.splice(index, 1);
        Network.emit('state-changed');
    });


    this.register = function (settings) {
        Network.currentDevice.register({
            host: 'https://nexus-io.herokuapp.com',
            //host: 'http://localhost:8080',
            apiKey: apiKey,
            name: settings.get('name'),
            id: settings.get('id')
        });
    }

    this.findDevice = function (id) {
        var deviceFound = null;
        Network.devices.forEach(function (device) {
            if (device.id == id) {
                deviceFound = device;
            }
        });
        return deviceFound;
    }
}

util.inherits(Network, EventEmitter);

module.exports = new Network();
