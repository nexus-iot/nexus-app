var ipcRenderer = require('electron').ipcRenderer;

app.controller('PreferencesCtrl', function($scope, $timeout, $location){

    $scope.deviceName = '';

    ipcRenderer.send('preferences-ready');

    ipcRenderer.on('device-name', function (event, arg) {
        console.log('ok');
        $scope.deviceName = arg;
    });

    $scope.save = function () {
        ipcRenderer.send('preferences-save', $scope.deviceName);

    };
    // 
    // $scope.$watch('deviceName', function (newValue, oldValue) {
    //     console.log(newValue);
    // });

    $scope.cancel = function () {
        ipcRenderer.send('preferences-close');
    };


});
