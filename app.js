/*jslint es5:true*/

/**
 * Module dependencies.
 */

var express = require('express'),
  // routes = require('./routes'),
  // about = require('./routes/about'),
  http = require('http'),
  https = require('https'),
  fs = require('fs'),
  slash = require('express-slash'),
  multer = require('multer'),
  path = require('path');

var key = fs.readFileSync('./config/node.key'),
  cert = fs.readFileSync('./config/node.pem'),
  credentials = {
    key: key,
    cert: cert
  };


var mongoose = require('mongoose');
mongoose.connection.close();

var User = require('./model/user.js').User;
var Form = require('./model/form.js').Form;
var Traveler = require('./model/traveler.js').Traveler;
var TravelerData = require('./model/traveler.js').TravelerData;
var TravelerComment = require('./model/traveler.js').TravelerComment;
var Router = require('./model/router.js').Router;

mongoose.connect('mongodb://localhost/traveler');

mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection opened.');
});

mongoose.connection.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});


var auth = require('./lib/auth');

var app = express();

var api = express();

var uploadDir = './uploads/';

app.enable('strict routing');

var access_logfile = fs.createWriteStream('./logs/access.log', {
  flags: 'a'
});

app.configure(function () {
  app.set('port', process.env.PORT || 3001);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  // app.use(express.logger({stream: access_logfile}));
  app.use(express.compress());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
  app.use(express.logger('dev'));
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'traveler_secret',
    cookie: {
      maxAge: 28800000
    }
  }));
  app.use(multer({
    dest: uploadDir,
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024
    }
  }));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(app.router);
  app.use(slash());
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

require('./routes/form')(app);

require('./routes/traveler')(app);

require('./routes/router')(app);

require('./routes/user')(app);

require('./routes/profile')(app);

require('./routes/device')(app);

require('./routes/about')(app);

app.get('/api', function (req, res) {
  res.render('api');
});

app.get('/', auth.ensureAuthenticated, function (req, res) {
  res.send(200, 'the main page is under development');
});

app.get('/logout', function (req, res) {
  if (req.session) {
    req.session.destroy(function (err) {
      if (err) {
        console.error(err);
      }
    });
  }
  res.redirect('https://liud-dev.nscl.msu.edu/cas/logout');
});

app.get('/apis', function (req, res) {
  res.redirect('https://' + req.host + ':' + api.get('port') + req.originalUrl);
});

api.enable('strict routing');
api.configure(function () {
  api.set('port', process.env.PORT || 3443);
  api.use(express.logger('dev'));
  // api.use(express.logger({stream: access_logfile}));
  api.use(auth.basicAuth);
  api.use(express.compress());
  // api.use(express.static(path.join(__dirname, 'public')));
  // api.use(express.json());
  // api.use(express.urlencoded());
  api.use(api.router);
  api.use(slash());
});

require('./routes/api')(api);

var server = http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port  ' + app.get('port'));
});

var apiserver = https.createServer(credentials, api).listen(api.get('port'), function () {
  console.log('API server listening on port ' + api.get('port'));
});

function cleanup() {
  server._connections = 0;
  apiserver._connections = 0;
  server.close(function () {
    apiserver.close(function () {
      console.log("Closed out remaining connections.");
      // Close db connections, other chores, etc.
      mongoose.connection.close();
      process.exit();
    });
  });

  setTimeout(function () {
    console.error("Could not close connections in time, forcing shut down");
    process.exit(1);
  }, 30 * 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
