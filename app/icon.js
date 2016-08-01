const electron = require('electron');

var os = require('os');
var path = require('path');
var nativeImage = electron.nativeImage;

var osIcon = '';

var relativePosition = '';

switch (os.platform()) {
    case 'darwin':
        osIcon = 'mac';
        relativePosition = 'top right';
        break;
    case 'win32':
        osIcon = 'windows';
        relativePosition = 'bottom right';
        break;
    case 'linux':
        osIcon = 'ubuntu';
        relativePosition = 'top right';
        break;
    default:
        osIcon = '';
        relativePosition = '??';
        break;
}

var basename = 'nexus'+(osIcon!=''?'-':'')+osIcon+'.png';

var whiteBasename = 'nexus-white.png';

var dirname = '../ui/img/';

module.exports = {
    basename: basename,
    icon: nativeImage.createFromPath(path.join(__dirname, dirname,  basename)),
    position: relativePosition
};
