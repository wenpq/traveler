/*jslint es5: true */

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


var endorsement = new Schema({
  endorsedBy: {
    type: ObjectId,
    ref: 'User'
  },
  endorsedOn: Date
});


var hold = new Schema({
  title: String,
  description: String,
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  stakeholders: [{
    type: ObjectId,
    ref: 'User'
  }],
  rule: {
    type: String,
    enum: {
      values: ['one', 'majority', 'consensus'],
      message: 'enum validator failed for "{PATH}" with value "{VALUE}"'
    }
  }
});


/*******
status := 0 // initialized
        | 1 // active
        | 2 // passed
*******/

var holdPoint = new Schema({
  title: String,
  description: String,
  status: Number,
  referenceHold: {type: ObjectId, ref: 'Hold'},
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  stakeholders: [{
    type: ObjectId,
    ref: 'User'
  }],
  rule: {
    type: String,
    enum: {
      values: ['one', 'majority', 'consensus'],
      message: 'enum validator failed for "{PATH}" with value "{VALUE}"'
    }
  },
  endorsements: [endorsement]
});


// route is the template for routers
// a step is either a form or a hold
var route = new Schema({
  title: String,
  description: String,
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  sharedWith: [sharedWithUser],
  steps: [{
    type: ObjectId,
    ref: String
  }]
});


/*******
status := 0 // initialized
        | 1 // working
        | 2 // finished
        | 3 // aborted
*******/

// task is either a traveler or a hold point
var router = new Schema({
  title: String,
  description: String,
  device: String,
  status: Number,
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  sharedWith: [sharedWithUser],
  tasks: [{
    type: ObjectId,
    ref: String
  }],
  finishedTasks: [{
    type: ObjectId,
    ref: String
  }],
  notes: [{
    type: ObjectId,
    ref: 'RouterNote'
  }],
  referenceRouter: {
    type: ObjectId,
    ref: 'Router'
  }
});

// task is either a traveler or a hold point
var taskNote = new Schema({
  task: {
    type: ObjectId,
    ref: String
  },
  value: String,
  inputBy: String,
  inputOn: Date
});


var Hold = mongoose.model('Hold', hold);
var HoldPoint = mongoose.model('HoldPoint', holdPoint);
var Route = mongoose.model('Route', route);
var Router = mongoose.model('Router', router);
var TaskNote = mongoose.model('TaskNote', taskNote);

module.exports = {
  Hold: Hold,
  HoldPoint: HoldPoint,
  Route: Route,
  Router: Router,
  TaskNote: TaskNote
};
