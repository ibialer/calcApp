var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var math = require('mathjs');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

/////////////////////////////////////////////////////////////////////////////// MYAPP
var mongoose = require('mongoose');
mongoose.connect('mongodb://ibialer:ibialer@ds045531.mongolab.com:45531/CloudFoundry_dvkaut72_eggt439f');
//mongoose.connect('mongodb://localhost/test');

// parsing rediscloud credentials
var vcap_services = process.env.VCAP_SERVICES;
var rediscloud_service = JSON.parse(vcap_services)["rediscloud"][0];
var credentials = rediscloud_service.credentials;

var redis = require('redis');
var client = redis.createClient(credentials.port, credentials.hostname, {no_ready_check: true});
client.auth(credentials.password);

client.on('connect', function() {
    console.log('connected to redis');
});

var UserSchema = new mongoose.Schema({
    userName: String,
    grade: String
});

var User = mongoose.model('User', UserSchema);

var operators = {
    1: "+",
    2: "-",
    3: "*",
    4: "/"
};

app.get('/leadingUser', function (req, res) {
    client.get('Leading', function(err, reply) {
        res.json(reply);
    });
});

app.get('/calcs', function (req, res) {
    var calcs = [];
    for (var i=0;i<10;i++) {
        calcs.push({
            first: Math.floor((Math.random() * 100) + 1),
            second: Math.floor((Math.random() * 100) + 1),
            operator: operators[Math.floor((Math.random() * 4) + 1)]
        })
    }
    res.json(calcs);
});

app.get('/usersTable', function(req, res) {
    User.find(function(err, users){
        res.json(users);
    });
});

app.post('/calcs/:userName', function (req, res) {
    var j = 0;
    for (var i=0;i<req.body.length;i++) {
        //if (req.body[i].operator === "+") {
        //    if (req.body[i].first + req.body[i].second == req.body[i].result) {
        //        j++;
        //    }
        //}
        //if (req.body[i].operator === "*") {
        //    if (req.body[i].first * req.body[i].second == req.body[i].result) {
        //        j++;
        //    }
        //}
        //if (req.body[i].operator === "-") {
        //    if (req.body[i].first - req.body[i].second == req.body[i].result) {
        //        j++;
        //    }
        //}
        //if (req.body[i].operator === "/") {
        //    if (req.body[i].first / req.body[i].second == req.body[i].result) {
        //        j++;
        //    }
        //}

        var result = math.round(math.eval(req.body[i].first + req.body[i].operator + req.body[i].second), 2);
        if (math.round(req.body[i].result, 2) === result) {
            j++;
        }

        console.log()
    }

    var user = new User();
    user.userName = req.params.userName;
    user.grade = j;

    User.findOne().sort('-grade').exec(function(err, doc){
        if (doc.grade < j) {
            client.set('Leading', user.userName);
        }
    });

    user.save(function(err, user){
        if(err){ return next(err); }

        res.json(user);
    });
});
//////////////////////////////////////////////////////////////////////////////// MYAPP

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
