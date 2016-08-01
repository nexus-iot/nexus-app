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

    $scope.ok = function () {
        if ($scope.deviceName.length >= 5) {
            ipcRenderer.send('setup-done', $scope.deviceName);
            //$location.path('/registering');
        }
    };


});
