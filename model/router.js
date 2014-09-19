var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

/******
access := 0 // for read or
        | 1 // for write
******/
var sharedWithUser = new Schema({
  _id: String,
  username: String,
  access: Number
});

// dependencies are the tasks that this task depends on.
// This task cannot be started before the dependencies are finished.

// var task = new Schema({
//   sequence: Number,
//   traveler: {type: ObjectId, ref: 'Traveler'},
//   dependencies: [ObjectId],
//   title: String
// });


/*******
status := 0 // initialized
        | 1 // working
        | 2 // finished
        | 3 // aborted
*******/

var router = new Schema({
  title: String,
  description: String,
  status: Number,
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  sharedWith: [sharedWithUser],
  tasks: [{type: ObjectId, ref: String}],
  finishedTasks: [{type: ObjectId, ref: String}],
  referenceRouter: {type: ObjectId, ref: 'Router'}
});


var Router = mongoose.model('Router', router);

module.exports = {
  Router: Router
};
