var ad = require('../config/ad.json');
var ldapClient = require('../lib/ldap-client');

var auth = require('../lib/auth');
var mongoose = require('mongoose');
// var sanitize = require('sanitize-caja');
// var util = require('util');
// var underscore = require('underscore');


var Router = mongoose.model('Router');
var User = mongoose.model('User');

/*function addUserFromAD(req, res, form) {
  var name = req.param('name');
  var nameFilter = ad.nameFilter.replace('_name', name);
  var opts = {
    filter: nameFilter,
    attributes: ad.objAttributes,
    scope: 'sub'
  };

  ldapClient.search(ad.searchBase, opts, false, function (err, result) {
    if (err) {
      console.error(err.name + ' : ' + err.message);
      return res.json(500, err);
    }

    if (result.length === 0) {
      return res.send(404, name + ' is not found in AD!');
    }

    if (result.length > 1) {
      return res.send(400, name + ' is not unique!');
    }

    var id = result[0].sAMAccountName.toLowerCase();
    var access = 0;
    if (req.param('access') && req.param('access') === 'write') {
      access = 1;
    }
    form.sharedWith.addToSet({
      _id: id,
      username: name,
      access: access
    });
    form.save(function (err) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      var user = new User({
        _id: result[0].sAMAccountName.toLowerCase(),
        name: result[0].displayName,
        email: result[0].mail,
        office: result[0].physicalDeliveryOfficeName,
        phone: result[0].telephoneNumber,
        mobile: result[0].mobile,
        forms: [form._id]
      });
      user.save(function (err) {
        if (err) {
          console.error(err.msg);
        }
      });
      return res.send(201, 'The user named ' + name + ' was added to the share list.');
    });
  });
}*/

/*function canWrite(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return true;
  }
  if (doc.sharedWith.id(req.session.userid) && doc.sharedWith.id(req.session.userid).access === 1) {
    return true;
  }
  return false;
}*/

/*function canRead(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return true;
  }
  if (doc.sharedWith.id(req.session.userid)) {
    return true;
  }
  return false;
}*/

/*****
access := -1 // no access
        | 0  // read
        | 1  // write
*****/

/*function getAccess(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return 1;
  }
  if (doc.sharedWith.id(req.session.userid)) {
    return doc.sharedWith.id(req.session.userid).access;
  }
  return -1;
}*/

/*function getSharedWith(sharedWith, name) {
  var i;
  if (sharedWith.length === 0) {
    return -1;
  }
  for (i = 0; i < sharedWith.length; i += 1) {
    if (sharedWith[i].username === name) {
      return i;
    }
  }
  return -1;
}*/

/*function addUser(req, res, form) {
  var name = req.param('name');

  // check local db first then try ad
  User.findOne({
    name: name
  }, function (err, user) {
    if (err) {
      console.error(err.msg);
      return res.send(500, err.msg);
    }
    if (user) {
      var access = 0;
      if (req.param('access') && req.param('access') === 'write') {
        access = 1;
      }
      form.sharedWith.addToSet({
        _id: user._id,
        username: name,
        access: access
      });
      form.save(function (err) {
        if (err) {
          console.error(err.msg);
          return res.send(500, err.msg);
        }
        return res.send(201, 'The user named ' + name + ' was added to the share list.');
      });
      user.update({
        $addToSet: {
          forms: form._id
        }
      }, function (err) {
        if (err) {
          console.error(err.msg);
        }
      });
    } else {
      addUserFromAD(req, res, form);
    }
  });

}*/


function filterBody(strings) {
  return function (req, res, next) {
    var k, found = false;
    for (k in req.body) {
      if (req.body.hasOwnProperty(k)) {
        if (strings.indexOf(k) !== -1) {
          found = true;
        } else {
          req.body[k] = null;
        }
      }
    }
    if (found) {
      next();
    } else {
      return res.send(400, 'cannot find required information in body');
    }
  };
}

module.exports = function (app) {

  app.get('/routers/', auth.ensureAuthenticated, function (req, res) {
    res.render('routers');
  });


  app.get('/routers/new', auth.ensureAuthenticated, function (req, res) {
    res.render('newrouter');
  });

  app.post('/routers/', auth.ensureAuthenticated, filterBody(['title']), function (req, res) {
    var router = new Router({
      title: req.body.title,
      status: 0,
      createdBy: req.session.userid,
      createdOn: Date.now(),
      sharedWith: [],
      travelers: []
    });

    router.save(function (err, doc) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      console.log('new router ' + doc.id + ' created');
      var url = req.protocol + '://' + req.get('host') + '/router/' + doc.id + '/';
      res.set('Location', url);
      return res.send(201, 'You can see the new router at ' + url);
    });
  });
};
