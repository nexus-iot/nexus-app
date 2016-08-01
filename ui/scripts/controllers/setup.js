var ipcRenderer = require('electron').ipcRenderer;

app.controller('SetupCtrl', function($scope, $timeout, $location){
    $scope.deviceName = '';

    $scope.loading = false;
    $scope.state = 'registering';

    ipcRenderer.on('registering', function () {
        $scope.loading = true;
        console.log('registering'+$scope.loading);
        $scope.$apply();
    });

    ipcRenderer.on('detecting', function () {
        $scope.state = 'detecting';
        $scope.$apply();
    });

    ipcRenderer.on('detection-done', function () {
        $scope.state = 'detection-done';
        $scope.$apply();
    });

    ipcRenderer.on('explain-icon', function (event, icon) {
        $scope.loading = false;
        $scope.state = 'explain-icon';
        $scope.iconFilename = icon.filename;
        $scope.iconPosition = icon.position;
        $scope.$apply();
    });

    ipcRenderer.on('explain-folder', function () {
        $scope.state = 'explain-folder';
        $scope.$apply();
    });


    $scope.ok = function () {
        if ($scope.state == 'registering' && $scope.deviceName.length >= 5) {
            ipcRenderer.send('setup-done', $scope.deviceName);
            //$location.path('/registering');
        } else if ($scope.state == 'explain-icon') {
            $scope.state = 'explain-folder';
        } else if ($scope.state == 'explain-folder') {
            $scope.state = 'finished';
        } else if ($scope.state == 'finished') {
            ipcRenderer.send('ready-to-start');
        }
    };

    $scope.openFolder = function () {
        ipcRenderer.send('open-folder');
    };


});
