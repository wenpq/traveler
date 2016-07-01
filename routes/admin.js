var auth = require('../lib/auth');

module.exports = function (app) {
  app.get('/admin/', auth.ensureAuthenticated, function (req, res) {
    if (req.session.roles === undefined || req.session.roles.indexOf('admin') === -1) {
      return res.status(403).send('only admin allowed');
    }
    return res.render('admin');
  });

  app.get('/admin/users/:id', auth.ensureAuthenticated, function (req, res) {
    return res.render('all-table');
  });

};
