/*global FormFile: false, TravelerData: false*/
/*jslint es5:true*/

var ad = require('../config/ad.json');
var ldapClient = require('../lib/ldap-client');

var auth = require('../lib/auth');
var mongoose = require('mongoose');
var sanitize = require('sanitize-caja');
var util = require('util');
var underscore = require('underscore');


var Form = mongoose.model('Form');
var FormFile = mongoose.model('FormFile');
var User = mongoose.model('User');

function addUserFromAD(req, res, form) {
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
}

function canWrite(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return true;
  }
  if (doc.sharedWith.id(req.session.userid) && doc.sharedWith.id(req.session.userid).access === 1) {
    return true;
  }
  return false;
}

function canRead(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return true;
  }
  if (doc.sharedWith.id(req.session.userid)) {
    return true;
  }
  return false;
}

/*****
access := -1 // no access
        | 0  // read
        | 1  // write
*****/

function getAccess(req, doc) {
  if (doc.createdBy === req.session.userid) {
    return 1;
  }
  if (doc.sharedWith.id(req.session.userid)) {
    return doc.sharedWith.id(req.session.userid).access;
  }
  return -1;
}

function getSharedWith(sharedWith, name) {
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
}

function addUser(req, res, form) {
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

}


module.exports = function (app) {

  app.get('/forms/json', auth.ensureAuthenticated, function (req, res) {
    Form.find({
      createdBy: req.session.userid
    }, 'title createdBy createdOn updatedBy updatedOn sharedWith').lean().exec(function (err, forms) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      res.json(200, forms);
    });
  });

  app.get('/sharedforms/json', auth.ensureAuthenticated, function (req, res) {
    User.findOne({
      _id: req.session.userid
    }, 'forms').lean().exec(function (err, me) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!me) {
        return res.send(400, 'cannot identify the current user');
      }
      Form.find({
        _id: {
          $in: me.forms
        }
      }, 'title createdBy createdOn updatedBy updatedOn sharedWith').lean().exec(function (err, forms) {
        if (err) {
          console.error(err.msg);
          return res.send(500, err.msg);
        }
        res.json(200, forms);
      });
    });
  });


  app.get('/forms/new', auth.ensureAuthenticated, function (req, res) {
    return res.render('newform');
  });

  app.get('/forms/:id/', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }

      var access = getAccess(req, form);

      if (access === -1) {
        return res.send(403, 'you are not authorized to access this resource');
      }

      if (access === 1) {
        return res.render('builder', {
          id: req.params.id,
          title: form.title,
          html: form.html
        });
      }

      // return res.render('viewer', {
      //   id: req.params.id,
      //   title: form.title,
      //   html: form.html
      // });
      return res.redirect('forms/' + req.params.id + '/preview');
    });
  });

  app.post('/forms/:id/uploads/', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, doc) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!doc) {
        return res.send(410, 'gone');
      }
      if (!canWrite(req, doc)) {
        return res.send(403, 'You are not authorized to access this resource.');
      }

      if (underscore.isEmpty(req.files)) {
        return res.send(400, 'Expecte One uploaded file');
      }

      if (!req.body.name) {
        return res.send(400, 'Expecte input name');
      }

      var file = new FormFile({
        form: doc._id,
        value: req.files[req.body.name].originalname,
        file: {
          path: req.files[req.body.name].path,
          encoding: req.files[req.body.name].encoding,
          mimetype: req.files[req.body.name].mimetype
        },
        inputType: req.body.type,
        uploadedBy: req.session.userid,
        uploadedOn: Date.now()
      });

      // console.dir(data);
      file.save(function (err, newfile) {
        if (err) {
          console.error(err.msg);
          return res.send(500, err.msg);
        }
        var url = req.protocol + '://' + req.get('host') + '/formfiles/' + newfile.id;
        res.set('Location', url);
        return res.send(201, 'The uploaded file is at <a href="' + url + '">' + url + '</a>');
      });
    });
  });

  app.get('/formfiles/:id', auth.ensureAuthenticated, function (req, res) {
    FormFile.findById(req.params.id).lean().exec(function (err, data) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!data) {
        return res.send(410, 'gone');
      }
      if (data.inputType === 'file') {
        res.sendfile(data.file.path);
      } else {
        res.send(500, 'it is not a file');
      }
    });
  });

  app.get('/forms/:id/preview', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }

      var access = getAccess(req, form);

      if (access === -1) {
        return res.send(403, 'you are not authorized to access this resource');
      }

      return res.render('viewer', {
        id: req.params.id,
        title: form.title,
        html: form.html
      });
    });
  });

  app.get('/forms/:id/share/', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id).lean().exec(function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }
      if (form.createdBy !== req.session.userid) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      return res.render('share', {
        type: 'Form',
        id: req.params.id,
        title: form.title
      });
    });
  });

  app.get('/forms/:id/share/json', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id).lean().exec(function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }
      if (form.createdBy !== req.session.userid) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      return res.json(200, form.sharedWith || []);
    });
  });

  app.post('/forms/:id/share/', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }
      if (form.createdBy !== req.session.userid) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      var share = getSharedWith(form.sharedWith, req.param.name);
      if (share === -1) {
        // new user
        addUser(req, res, form);
      } else {
        // the user cannot be changed in this way
        return res.send(400, 'The user named ' + req.param.name + ' is already in the list.');
      }
    });
  });


  app.put('/forms/:id/share/:userid', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }
      if (form.createdBy !== req.session.userid) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      var share = form.sharedWith.id(req.params.userid);
      if (share) {
        // change the access
        if (req.body.access && req.body.access === 'write') {
          share.access = 1;
        } else {
          share.access = 0;
        }
        form.save(function (err) {
          if (err) {
            console.error(err.msg);
            return res.send(500, err.msg);
          }
          // check consistency of user's form list
          User.findByIdAndUpdate(req.params.userid, {
            $addToSet: {
              forms: form._id
            }
          }, function (err, user) {
            if (err) {
              console.error(err.msg);
            }
            if (!user) {
              console.error('The user ' + req.params.userid + ' does not in the db');
            }
          });
          return res.send(204);
        });
      } else {
        // the user should in the list
        return res.send(400, 'cannot find the user ' + req.params.userid);
      }
    });
  });

  app.delete('/forms/:id/share/:userid', auth.ensureAuthenticated, function (req, res) {
    Form.findById(req.params.id, function (err, form) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      if (!form) {
        return res.send(410, 'gone');
      }
      if (form.createdBy !== req.session.userid) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      var share = form.sharedWith.id(req.params.userid);
      if (share) {
        share.remove();
        form.save(function (err) {
          if (err) {
            console.error(err.msg);
            return res.send(500, err.msg);
          }
          // keep the consistency of user's form list
          User.findByIdAndUpdate(req.params.userid, {
            $pull: {
              forms: form._id
            }
          }, function (err, user) {
            if (err) {
              console.error(err.msg);
            }
            if (!user) {
              console.error('The user ' + req.params.userid + ' does not in the db');
            }
          });
          return res.send(204);
        });
      } else {
        return res.send(400, 'no share info found for ' + req.params.userid);
      }
    });
  });

  app.post('/forms/', auth.ensureAuthenticated, function (req, res) {
    var form = {};
    if (!!req.body.html) {
      form.html = sanitize(req.body.html);
    } else {
      form.html = '';
    }
    form.title = req.body.title;
    form.createdBy = req.session.userid;
    form.createdOn = Date.now();
    form.sharedWith = [];
    (new Form(form)).save(function (err, newform) {
      if (err) {
        console.error(err.msg);
        return res.send(500, err.msg);
      }
      var url = req.protocol + '://' + req.get('host') + '/forms/' + newform.id + '/';
      res.set('Location', url);
      return res.send(201, 'You can see the new form at <a href="' + url + '">' + url + '</a>');
    });
  });

  app.put('/forms/:id/', auth.ensureAuthenticated, function (req, res) {
    if (!req.is('json')) {
      return res.send(415, 'json request expected');
    }
    var form = {};
    if (req.body.hasOwnProperty('html')) {
      form.html = sanitize(req.body.html);
    }
    if (req.body.hasOwnProperty('title')) {
      form.title = req.body.title;
    }

    if (form.hasOwnProperty('html') || form.hasOwnProperty('title')) {
      form.updatedBy = req.session.userid;
      form.updatedOn = Date.now();
    } else {
      return res.send('400', 'no update details found');
    }

    Form.findById(req.params.id, function (err, doc) {
      if (err) {
        console.dir(err);
        return res.send(500, err.msg || err.errmsg);
      }
      if (getAccess(req, doc) !== 1) {
        return res.send(403, 'you are not authorized to access this resource');
      }
      doc.update(form, function (err, old) {
        if (err) {
          console.dir(err);
          return res.send(500, err.msg || err.errmsg);
        }
        if (old) {
          return res.send(204);
        }
        return res.send(410, 'cannot find form ' + req.params.id);
      });
    });
  });
};
