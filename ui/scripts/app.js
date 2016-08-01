var app = angular.module('app', ['ngRoute']);
app.config(function($routeProvider) {
    $routeProvider.
    when('/', {
        templateUrl: 'partials/main.html',
        controller: 'MainCtrl'
    }).
    when('/setup', {
        templateUrl: 'partials/setup.html',
        controller: 'SetupCtrl'
    }).
    when('/preferences', {
        templateUrl: 'partials/preferences.html',
        controller: 'PreferencesCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });

    /*
      .when('/Book/:bookId/ch/:chapterId', {
        templateUrl: 'chapter.html',
        controller: 'ChapterCtrl',
        controllerAs: 'chapter'
    });*/

    //$locationProvider.html5Mode(true);
});
