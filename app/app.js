const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
const ipc = electron.ipcMain;
const Tray = electron.Tray;
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const nativeImage = electron.nativeImage;
const ipcMain = electron.ipcMain;
const dialog = require('electron').dialog;

var device = require('nexus.io').device;
var express = require('express')();
var server = require('http').Server(express);
var io = require('socket.io')(server);
var client = require('socket.io-client');

//const clipboard = electron.clipboard;
const path = require('path');
var fs = require('fs-extra');
var settings = require('./settings');
var actions = require('./actions');

var apiKey = "880eaa008f725db601350115c2b7943d6b94fc2dfb9fe70b5440fe6be4abc116";
var isRegistered = false;
var menu = new Menu();
var devices = [];
var trayIcon = null;
var sender = null;
var setupWindow = null;
var preferencesWindow = null;

var port = 8888;

function setupMenu (devices) {
    menu = new Menu();

    if (isRegistered) {
        var devicesAdded = 0;
        devices.forEach (function (newDevice) {
            if (newDevice.id != device.id) {
                menu.append(new MenuItem({label:newDevice.name, type:'normal', click: function () {

                    var filenames = dialog.showOpenDialog({properties: ['openFile']});
                    if (filenames.length == 0) {
                        return;
                    }
                    console.log(filenames[0]);
                    var filename = filenames[0];
                    var socket = client('http://'+newDevice.privateIp+':'+port);

                    var action = actions.ask(device.id, settings.get('name'), newDevice, filename, []);
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
                    });

                    socket.on('ko', function () {
                        action.state = 'disabled';
                    });
                }}));
                devicesAdded++;
            }
        });

        if (devicesAdded == 0) {
            menu.append(new MenuItem({label: 'No device detected', type:'normal', enabled:false}));
        }
    } else {
        menu.append(new MenuItem({label: 'Offline', type:'normal', enabled:false}));
    }

    // menu.append(new MenuItem({label: 'toto', type:'normal', click: function () {
    // }}));

    menu.append(new MenuItem({type:'separator'}));
    menu.append(new MenuItem({label: 'Preferences', type:'normal', click: function () {
        openPreferences();
    }}));
    menu.append(new MenuItem({label: 'Quit', type:'normal', click: function () {
        device.unregister();
        app.quit();
        process.exit(0);
    }}));

    if (trayIcon) {
        trayIcon.setContextMenu(menu);
    }
}

function setupIcon () {
    var image = nativeImage.createFromPath(path.join(__dirname, '../ui/img/nexus-ubuntu.png'));

    trayIcon = new Tray(image);
    trayIcon.setToolTip('Nexus App');
}

function openPreferences () {
    preferencesWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        resizable: false,
        //fullscreen: true,
        //alwaysOnTop: true,
        titleBarStyle: 'hidden',
        title: app.getName()
    });
    preferencesWindow.setMenu(null);
    preferencesWindow.loadURL(path.join('file://', __dirname, '../ui/index.html')+'#/preferences');
    preferencesWindow.show();
}

function register () {
    device.register({
        host: 'https://nexus-io.herokuapp.com',
        //host: 'http://localhost:8080',
        apiKey: apiKey,
        name: settings.get('name'),
        id: settings.get('id')
    });
}

device.on('registered', function (newDevice) {
    isRegistered = true;
    console.log('registered', newDevice);
    if (sender) {
        sender.send('detecting');
    }
    device.detect();
    setupMenu(devices);
});

device.on('unregistered', function () {
    isRegistered = false;
    devices = [];
    setupMenu(devices);
});

device.on('devices', function (newDevices) {
    console.log('devices');
    console.log(newDevices);
    devices = newDevices;
    if (sender) {
        sender.send('detection-done');
    }
    setupMenu(devices);
    if (setupWindow) {
        setTimeout(function () {
            setupWindow.close();
        }, 2000);
        setupIcon();
        setupMenu(devices);
    }
})

device.on('device-joined', function (newDevice) {
    console.log('device-joined');
    console.log(newDevice);
    devices.push(newDevice);
    setupMenu(devices);
});

device.on('device-leaved', function (oldDevice) {
    console.log('device-leaved');
    console.log(oldDevice);
    var index = 0;
    for(var i = 0 ;  i < devices.length ; i++) {
        if (oldDevice.id == devices[i].id) {
            index = i;
        }
    }
    devices.splice(index, 1);
    setupMenu(devices);
});

var mainWindow = null;

app.setName('Elqui');
app.on('ready', function () {

    settings.load(function (err) {
        if (err) {
            setupWindow = new BrowserWindow({
                width: 400,
                height: 500,
                resizable: false,
                //fullscreen: true,
                //alwaysOnTop: true,
                skipTaskbar: true,
                //kiosk: true,
                autoHideMenuBar: true,
                titleBarStyle: 'hidden',
                title: app.getName()
            });
            setupWindow.setMenu(null);
            setupWindow.loadURL(path.join('file://',  __dirname, '../ui/index.html')+'#/setup');
            setupWindow.show();

            ipcMain.on('setup-done', function (event, deviceName) {
                console.log('setup-done');
                settings.set('name', deviceName);
                settings.set('id', device.id);
                settings.save();
                //console.log(arg)  // prints "ping"
                sender = event.sender;
                event.sender.send('registering');
                register();
            });
            console.log(err);
        } else {
            setupIcon();
            setupMenu(devices);
            register();
        }
    });


    //var image = NativeImage.createFromPath();

    //var menu = new Menu();

    //appIcon.setContextMenu(menu);
    /*
    var windowOptions = {
        width: 880,
        height: 400,
        resizable: true,
        //fullscreen: true,
        //alwaysOnTop: true,
        titleBarStyle: 'hidden',
        title: app.getName()
    };


    var mainWindow = null;
    mainWindow = new BrowserWindow(windowOptions);
    //mainWindow.loadURL('http://localhost:8080');
    mainWindow.loadURL(path.join('file://', folders.renderer, 'index.html'));
    mainWindow.webContents.openDevTools();
    //mainWindow.show();
    */



});

app.on('window-all-closed', function () {
//     app.quit();
});

express.get('/access/:link', function (req, res, next) {
    var link = req.params.link;
    var target = null;

    actions.actions().forEach(function (action) {
        if (action.description.meta.link == link && action.state == 'enabled') {
            target = file;
        }
    });

    if (target) {
        res.sendFile(action.meta.path);
    } else {
        res.sendStatut(403);
    }

});

server.listen(port);

io.on('connection', function (socket) {
  socket.on('ask', function (action) {
    console.log(action);
  });
});
