var randomstring = require('randomstring');
var path = require('path');
var clipboard = require('electron').clipboard;


var actions = [];

function generateLink (filename) {
    var hash = randomstring.generate(256);
    var link = hash+'/'+path.basename(filename);
    var file = {
        link: link,
        path: filename
    };
    return link;
}

function ask(currentId, currentName, targetDevice, filename, rules) {

    //var filename = '/home/thibault/Vidéos/Teenage.Mutant.Ninja.Turtles.2016.720p.BrRip.x264.AAC-FXG/'
    //+'Teenage.Mutant.Ninja.Turtles.Out.of.the.Shadows.2016.720p.BrRip.x264.AAC-FXG.wmv';

    var link = generateLink(filename);

    var action = {
        description: {
            origin: {
                id: currentId,
                name: currentName,
            },
            id: 'transfer-file',
            meta: {
                link: link
            }
        },
        state: 'standby',
        meta: {
            path: filename
        }
    };

    actions.push(action);

    return action;
}

module.exports = {
    ask: ask,
    actions: function () {
        return files;
    }
}
