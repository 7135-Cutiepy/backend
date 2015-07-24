var gulp = require('gulp');
var gls = require('gulp-live-server');

gulp.task('serve', function() {
    var server = gls.new('app.js');
    server.start();

    //use gulp.watch to trigger server actions(notify, start or stop)
    gulp.watch(['static/**/*.css', 'static/**/*.html'], function () {
        server.notify.apply(server, arguments);
    });
    gulp.watch('app.js', server.start.apply(server)); //restart my server
});