const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const app = electron.app;
const ipc = electron.ipcMain;
const Tray = electron.Tray;
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
const shell = electron.shell;

var device = require('nexus.io').device;
var express = require('express')();
var http = require('http');
var server = http.Server(express);
var io = require('socket.io')(server);
var client = require('socket.io-client');


//const clipboard = electron.clipboard;
const path = require('path');
var fs = require('fs-extra');
var settings = require('./settings');
var actions = require('./actions');
var icon = require('./icon');
var fileSize = require('file-size');

var apiKey = "880eaa008f725db601350115c2b7943d6b94fc2dfb9fe70b5440fe6be4abc116";
var isRegistered = false;
var menu = new Menu();
var devices = [];
var trayIcon = null;
var sender = null;
var setupWindow = null;
var preferencesWindow = null;

var downloadDirname = path.join(app.getPath('desktop'), 'Nexus');

var port = 8888;

function findDevice (id) {
    var deviceFound = null;
    devices.forEach(function (device) {
        if (device.id == id) {
            deviceFound = device;
        }
    });
    return deviceFound;
}

function setupMenu (devices) {
    menu = new Menu();

    if (isRegistered) {
        var devicesAdded = 0;
        devices.forEach (function (newDevice) {
            if (newDevice.id != device.id) {
                menu.append(new MenuItem({label:newDevice.name, type:'normal', click: function () {

                    var filenames = dialog.showOpenDialog({properties: ['openFile']});
                    if (!filenames || filenames.length == 0) {
                        return;
                    }
                    console.log(filenames[0]);
                    var filename = filenames[0];

                    var socket = client('http://'+newDevice.privateIp+':'+port, {
                        reconnection: false
                    });

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
                        socket.emit('lets-go');
                    });

                    socket.on('ko', function () {
                        action.state = 'disabled';
                    });

                    socket.on('disconnect', function () {
                        console.log('disconnection');
                    })
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
    trayIcon = new Tray(icon.icon);
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
        console.log({filename:icon.basename, position:icon.position});
        sender.send('explain-icon', {filename:icon.basename, position:icon.position});
    }

    if (setupWindow) {
        setupIcon();

        /*
        setTimeout(function () {
            setupWindow.close();
        }, 2000);*/
    }
    setupMenu(devices);

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
                //resizable: false,
                //fullscreen: true,
                //alwaysOnTop: true,
                //skipTaskbar: true,
                //kiosk: true,
                //autoHideMenuBar: true,
                titleBarStyle: 'hidden',
                title: app.getName()
            });
            setupWindow.setMenu(null);
            // setupWindow.showDevTools();
            setupWindow.loadURL(path.join('file://',  __dirname, '../ui/index.html')+'#/setup');
            setupWindow.show();

            ipcMain.on('setup-done', function (event, deviceName) {
                console.log('setup-done');
                settings.set('name', deviceName);
                settings.set('id', device.id);
                settings.save();
                fs.ensureDir(downloadDirname);
                //console.log(arg)  // prints "ping"
                sender = event.sender;
                event.sender.send('registering');
                register();
            });

            ipcMain.on('ready-to-start', function () {
                setupWindow.close();
            });

            ipcMain.on('open-folder', function () {
                console.log('openFolder');
                shell.showItemInFolder(downloadDirname);
            });
            //console.log(err);
        } else {
            setupIcon();
            setupMenu(devices);
            register();
            fs.ensureDir(downloadDirname);
        }
    });

});

app.on('window-all-closed', function () {
    //     app.quit();
});

express.get('/access/:link', function (req, res, next) {
    var link = req.params.link;
    var target = null;

    actions.actions().forEach(function (action) {
        if (action.description.meta.link == link && action.enabled == 'enabled') {
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
    console.log([socket.handshake.address, socket.request.connection.remoteAddress, socket.client.request.headers['x-forwarded-for'], socket.handshake.headers['x-real-ip']]);

    socket.on('ask', function (action) {
        var deviceSrc = findDevice(action.origin.id);
        var question = '';
        var detail = '';

        if (null != deviceSrc) {
            switch (action.id) {
                case 'transfer-file':
                    var filename = path.basename(action.meta.link);
                    var size = action.meta.size;
                    question= deviceSrc.name+' wants to send to you the file "'+filename+'" of '+fileSize(size)+'. Do you accept the transfer ?';
                    detail= 'The file will be downloaded in the folder Desktop';
            }
            console.log(action);
            var response = dialog.showMessageBox({
                type: 'question',
                icon: icon,
                buttons: ['Yes please', 'No thanks you'],
                title: 'Nexus',
                message: question,
                detail: detail
            });

            if (response == 0) {
                var filename = path.join(downloadDirname, path.basename(action.meta.link));
                var url = deviceSrc.privateIp+':'+port+action.meta.link;
                var file = fs.createWriteStream(filename);

                var request = http.get(url, function(response) {
                    var stream = response.pipe(file);
                    stream.on('finish', function () {
                        new Notification('Nexus', {
                            title: 'Nexus',
                            body: 'The file has been successfully downloaded',
                            icon: icon.filename
                        });
                    });
                });
                console.log(action.meta.link);
            } else {
                socket.disconnect();
            }
        }
    });
});
