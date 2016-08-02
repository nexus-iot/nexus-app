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

//const clipboard = electron.clipboard;
var path = require('path');
var fs = require('fs-extra');
var settings = require('./settings');
var actions = require('./actions');
var icon = require('./icon');
var fileSize = require('./file-size');
var network = require('./network');
var interact = require('./interact')(network, actions, settings);

var menu = new Menu();
var trayIcon = null;
var sender = null;
var setupWindow = null;
var preferencesWindow = null;

var downloadDirname = path.join(app.getPath('desktop'), 'Nexus');
fs.ensureDir(downloadDirname);

function setupMenu (devices) {
    menu = new Menu();

    if (network.currentDevice.isRegistered) {
        var devicesAdded = 0;
        devices.forEach (function (device) {
            if (device.id != network.currentDevice.id) {
                menu.append(new MenuItem({label:device.name, type:'normal', click: function () {
                    interact.click(device);
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

function openSetup () {
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
}

// communication with setupWindow
ipcMain.on('setup-done', function (event, deviceName) {
    console.log('setup-done');
    settings.set('name', deviceName);
    settings.set('id', device.id);
    settings.save();
    fs.ensureDir(downloadDirname);
    //console.log(arg)  // prints "ping"
    sender = event.sender;
    event.sender.send('registering');
    network.register(settings);
});

ipcMain.on('ready-to-start', function () {
    setupWindow.close();
    setupWindow = null;
});

ipcMain.on('open-folder', function () {
    console.log('openFolder');
    shell.showItemInFolder(downloadDirname);
});

network.on('state-changed', function () {
    if (setupWindow && !trayIcon) {
        setupIcon();
    }
    setupMenu(network.devices);
});

network.currentDevice.on('registered', function () {
    if (sender && setupWindow) {
        // we send that detection is done
        sender.send('detecting');
    }
});

network.currentDevice.on('devices', function () {
    if (sender && setupWindow) {
        sender.send('explain-icon', {filename:icon.basename, position:icon.position});
    }
});

app.setName('Elqui');
app.on('ready', function () {
    settings.load(function (err) {
        if (err) {
            //console.log(err);
            openSetup();
        } else {
            setupIcon();
            setupMenu(network.devices);
            network.register(settings);
        }
    });

});

app.on('window-all-closed', function () {
        // app.quit();
});

express.get('/access/:link', function (req, res, next) {
    var link = req.params.link;
    var target = null;
    console.log(req.url);

    actions.actions().forEach(function (action) {
        // console.log(action.description.meta.link);
        // console.log(link);
        // console.log(action.state);
        if (action.description.meta.link == link && action.state == 'enabled') {
            target = action;
        }
    });

    if (target) {
        res.download(target.meta.path, target.description.meta.filename, function (err) {
            if (err) {
                console.log(err);
            } else {
                target.state = 'finished';
            }
        });
        return;
    } else {
        res.sendStatus(403);
        return;
    }

}).get('*', function (req, res) {
    res.send('ok');
});

server.listen(network.port);

io.on('connection', function (socket) {
    console.log([socket.handshake.address, socket.request.connection.remoteAddress, socket.client.request.headers['x-forwarded-for'], socket.handshake.headers['x-real-ip']]);

    socket.on('ask', function (action) {
        var deviceSrc = findDevice(action.origin.id);
        var question = '';
        var detail = '';

        if (null != deviceSrc) {
            switch (action.id) {
                case 'transfer-file':
                var filename = action.meta.filename;
                var size = action.meta.size;
                question= deviceSrc.name+' wants to send to you the file "'+filename+'". Do you accept the transfer ?';
                detail= 'The file will be downloaded in the folder Desktop';
            }
            console.log(action);
            console.log(question);
            console.log(detail);
            dialog.showMessageBox({
                type: 'question',
                icon: icon.icon,
                buttons: ['Yes please', 'No thanks you'],
                title: 'Nexus',
                message: question,
                detail: detail
            }, function (response) {
                if (response == 0) {
                    socket.emit('ok');

                    socket.on('lets-go', function () {
                        var filename = path.join(downloadDirname, path.basename(action.meta.filename));
                        var url = 'http://'+deviceSrc.privateIp+':'+port+'/access/'+action.meta.link;
                        console.log(url);
                        var file = fs.createWriteStream(filename);
                        var request = http.get(url, function(response) {
                            console.log('begin download');

                            var stream = response.pipe(file);

                            stream.on('finish', function () {
                                console.log('finished');
                                socket.disconnect();
                                /*new Notification('Nexus', {
                                title: 'Nexus',
                                body: 'The file has been successfully downloaded',
                                icon: icon.filename
                            });*/
                            });
                        });
                    });
                } else {
                    socket.emit('ko');
                    socket.disconnect();
                }
            });
        }
    });
});
