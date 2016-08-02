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
var dirname = '../ui/img/';
var filename = path.join(__dirname, dirname,  basename);

var whiteBasename = 'nexus-white.png';


module.exports = {
    basename: basename,
    icon: nativeImage.createFromPath(filename),
    filename: filename,
    position: relativePosition
};
