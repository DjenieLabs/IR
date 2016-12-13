var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha');

// Check the code quality
gulp.task('qualitychecker', function(cb) {
    return gulp.src([
      '**/*.js',
      '!node_modules/**/*.js'])
    .pipe(jshint({esversion: 6}))
    .pipe(jshint.reporter('default'))
    .on('error', gutil.log);
});

gulp.task('test', ['qualitychecker'], function () {
    return gulp.src('IR/test/**/*.js', { read: false })
            .pipe(mocha())
            .pipe(gulp.dest('reports'));
});

gulp.task('default', ['test']);
