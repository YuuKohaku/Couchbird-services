require("harmonize")();
var gulp = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var babel = require("gulp-babel");
var concat = require("gulp-concat");
var watch = require('gulp-watch');

var ts = new Date();
var nts = new Date();
nts.setMinutes(ts.getMinutes() + 1);
nts.setSeconds(0);
nts.setMilliseconds(0);
var diff = (nts.getTime() - ts.getTime());

gulp.task("default", function () {
    return gulp.src(["src/**/*.js", "samples/**/*.js"])
        .pipe(babel({
            blacklist: ['bluebirdCoroutines', 'regenerator']
        }))
        .pipe(gulp.dest("build")).on('end', function () {

            setTimeout(function () {
                console.log('Starting at', nts.toTimeString());
                require('./build/broker');
            }, diff);
            setTimeout(function () {
                console.log('timeout');
                process.exit()
            }, (diff + 160000));
        });
});

gulp.task("replicator", function () {
    return gulp.src(["src/**/*.js", "samples/**/*.js"])
        .pipe(babel({
            blacklist: ['bluebirdCoroutines', 'regenerator']
        }))
        .pipe(gulp.dest("build")).on('end', function () {
            require('./build/replicator-events');
            setTimeout(function () {
                console.log('timeout');
                process.exit()
            }, 30000);
        });
});

gulp.task("facehug", function () {
    return gulp.src(["src/**/*.js", "samples/**/*.js"])
        .pipe(babel({
            blacklist: ['bluebirdCoroutines', 'regenerator']
        }))
        .pipe(gulp.dest("build")).on('end', function () {
            require('./build/facehug');
            setTimeout(function () {
                console.log('timeout');
                process.exit()
            }, 50000);
        });
});

gulp.task("booker", function () {
    return gulp.src(["src/**/*.js", "samples/**/*.js"])
        .pipe(babel({
            blacklist: ['bluebirdCoroutines', 'regenerator']
        }))
        .pipe(gulp.dest("build")).on('end', function () {
            require('./build/booker');
            setTimeout(function () {
                console.log('timeout');
                process.exit()
            }, 20000);
        });
});