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
var notify = require('./notifications');

var menu = new Menu();
var trayIcon = null;
var setupSender = null;
var preferencesSender = null;
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

                if (device.accessible) {

                    var submenu = new Menu();

                    console.log(device.services);
                    if (device.services && device.services.length > 0) {
                        device.services.forEach(function (service) {
                            submenu.append(new MenuItem({label: service.id, type:'normal'}));
                        });
                    } else {
                        submenu.append(new MenuItem({label: 'No services', type:'normal', enabled: false}));
                    }
                    menu.append(new MenuItem({label:device.name, type:'submenu', submenu:submenu}));

                    // function () {
                    //    interact.transferFile(device);
                    //}}));
                } else {
                    menu.append(new MenuItem({label:device.name, type:'normal', enabled: false}));
                }

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
    menu.append(new MenuItem({label: 'Open Nexus Folder', type:'normal', click: function () {
        shell.openItem(downloadDirname);
    }}));
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
        width: 500,
        height: 200,
        //resizable: false,
        //fullscreen: true,
        //alwaysOnTop: true,
        //titleBarStyle: 'hidden',
        title: app.getName()
    });
    //preferencesWindow.setMenu(null);
    preferencesWindow.loadURL(path.join('file://', __dirname, '../ui/index.html')+'#/preferences');
    preferencesWindow.show();

}

function openSetup () {
    setupWindow = new BrowserWindow({
        width: 400,
        height: 500,
        resizable: false,
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

function openDownloadFolder () {
    shell.showItemInFolder(downloadDirname);
}

// communication with setupWindow
ipcMain.on('setup-done', function (event, deviceName) {
    //console.log('setup-done');
    settings.set('name', deviceName);
    settings.set('id', device.id);
    settings.save();
    fs.ensureDir(downloadDirname);
    //console.log(arg)  // prints "ping"
    setupSender = event.sender;
    event.sender.send('registering');
    network.register(settings);
});

ipcMain.on('ready-to-start', function () {
    setupWindow.close();
    setupWindow = null;
    setupSender = null;
});

ipcMain.on('open-folder', function () {
    //console.log('openFolder');
    openDownloadFolder();
});

ipcMain.on('preferences-ready', function (event) {
    preferencesSender = event.sender;
    preferencesSender.send('device-name', settings.get('name'));
    console.log('preferences-ready');
});

ipcMain.on('preferences-close', function () {
    preferencesWindow.close();
    preferencesWindow = null;
    preferencesSender = null;
});

ipcMain.on('preferences-save', function (event, deviceName) {
    settings.set('name', deviceName);
    settings.save();
    preferencesWindow.close();
    preferencesWindow = null;
    preferencesSender = null;
});

network.on('state-changed', function () {
    if (setupWindow && !trayIcon) {
        setupIcon();
    }
    setupMenu(network.devices);
});

network.currentDevice.on('registered', function () {
    if (setupWindow && setupSender) {
        // we send that detection is done
        setupSender.send('detecting');
    }
});

network.currentDevice.on('devices', function () {
    if (setupWindow && setupSender) {
        setupSender.send('explain-icon', {filename:icon.basename, position:icon.position});
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

express
.get('/access/:link', function (req, res, next) {
    var link = req.params.link;
    var target = null;
    actions.actions().forEach(function (action) {
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
})
.get('*', function (req, res) {
    res.send('ok');
});

server.listen(network.port);

io.on('connection', function (socket) {
    console.log([socket.handshake.address, socket.request.connection.remoteAddress, socket.client.request.headers['x-forwarded-for'], socket.handshake.headers['x-real-ip']]);

    var validated = false;
    var action = null;
    var device = null

    socket.on('detect-services', function () {
        socket.emit('services', {type:'laptop', services:[{id:'file-transfer'}]});
    });

    socket.on('ask', function (newAction) {
        action = newAction;
        interact.showDialog(icon.icon, action,
            function (deviceSrc) {
                validated = true;
                device = deviceSrc;
                socket.emit('ok');
        }, function () {
            socket.emit('ko');
            socket.disconnect();
        })

    });

    socket.on('lets-go', function () {
        if (!validated && action && action) {
            return;
        }
        var basename = path.basename(action.meta.filename);
        var filename = path.join(downloadDirname, basename);
        var url = 'http://'+device.privateIp+':'+network.port+'/access/'+action.meta.link;
        console.log(url);
        var file = fs.createWriteStream(filename);
        var request = http.get(url, function(response) {
            console.log('begin download');

            var stream = response.pipe(file);

            stream.on('finish', function () {
                console.log('finished');
                socket.disconnect();
                notify('Nexus', 'The file "'+basename+'" has been successfully downloaded.')
                /*new Notification('Nexus', {
                title: 'Nexus',
                body: 'The file has been successfully downloaded',
                icon: icon.filename
            });*/
            });
        });
    });
});
