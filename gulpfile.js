var gulp = require('gulp'),
utils = require('gulp-util'),
jshint = require('gulp-jshint');
// var through = require('through2')
var pump = require('pump');
var uglify = require('gulp-uglify');
var uglifycss = require('gulp-uglifycss');
var htmlmin = require('gulp-htmlmin');
var babel = require('gulp-babel');

// Include Gulp
var gulp = require('gulp');
var dest = "dist/";

// Include plugins
var plugins = require("gulp-load-plugins")({
	pattern: ['gulp-*', 'gulp.*', 'main-bower-files'],
	replaceString: /\bgulp[\-.]/
});

// Check the code quality
gulp.task('qualitychecker', function(cb) {
	return gulp.src([
		'**/*.js',
		'!node_modules/**/*.js',
		'!dist/**/*.js',
		'!IR/components/**/*.js'])
		.pipe(jshint({esversion: 6}))
		.pipe(jshint.reporter('default'))
		.on('error', utils.log);
});


gulp.task('js', function (cb) {
  pump([
				gulp.src('IR/**/*.js'),
				babel({"presets": ["env"]}),
				uglify(),
        gulp.dest(dest)
    ],
    cb
  );
});


gulp.task('css', function(cb) {
	pump([
		gulp.src('IR/**/*.css'),
		uglifycss(),
		gulp.dest(dest)
	], cb);
});


gulp.task('html', function (cb) {
  pump([
				gulp.src('IR/**/*.html'),
				htmlmin({collapseWhitespace: true}),
        gulp.dest(dest)
    ],
    cb
  );
});

gulp.task('build', ['js', 'css', 'html']);
gulp.task('default', ['qualitychecker']);
