//var fs = require('fs-extra');
var gulp = require('gulp');
var watch = require('gulp-watch');
var fs = require('fs-extra');
var less = require('gulp-less');
var electron = require('electron-connect').server.create();

gulp.task('watch-electron', function () {
  // Start browser process
  electron.start();

  // Restart browser process
  gulp.watch('app/**', electron.restart);

  // Reload renderer process
  gulp.watch('ui/**', electron.reload); // seems to do not work
});

gulp.task('init', function () {
    fs.ensureDirSync(__dirname+'/tmp');
});

gulp.task('watch-less', function() {
    gulp.watch('./ui/style/*.less', ['less']);  // Watch all the .less files, then run the less task
});

gulp.task('less', function () {
    return gulp.src('./ui/style/style.less')
    .pipe(less())
    .pipe(gulp.dest('./ui/style/'));
});
