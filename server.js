const express = require('express');
const app = express();
const cors = require('cors');

// allow to parse body of POST requests
const bodyParser = require('body-parser');

// load mongoose
require('dotenv').config()
const mongoose = require("mongoose");
const { ObjectId } = require('mongodb');

// connect mongoose
mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true});

// exercise schema
const exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  tDate: {type: Date, default: Date.now}
});

// set virtual to output date string as required
exerciseSchema.virtual('date').get(function(){
  return this.tDate.toDateString();
});

// ensure virtual is returned as part of JSON
exerciseSchema.set('toJSON',{ virtuals: true });

// user schema & model
const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSchema]
});

const Usr = mongoose.model('User',userSchema);

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// route: create new user
app.post('/api/users',(req,res)=>{
  if (!req.body.username || req.body.username.trim().length == 0) {
    res.status(400);
    return;
  }
  // cleaned version of username
  const uName = req.body.username.trim();

  // check that user with this username doesn't exist
  Usr.findOne({username: uName},(err,data)=>{
    if (!err && !!data && data.length > 0) {
      res.status(400);
      return;
    }
  });

  // create new user
  const u = new Usr();
  u.username = uName;
  u.save();
  res.json(u);
});

// route: get user list
app.get('/api/users',(req,res)=>{
  // request all users from mongo
  Usr.find({ },(err,data)=>{
    if (err) {
      res.status(404);
      return;
    }
    res.json(data);
  });
});

// route: add exercise to user
app.post('/api/users/:id/exercises',(req,res,next)=>{
  if (!req.body.description || !req.body.duration) {
    res.status(400);
    return;
  }
  
  // data to insert
  const ex = { description: req.body.description, duration: req.body.duration};
  // date only needs to be set if it has been passed - otherwise Mongo will default it
  if (req.body.date) {
    ex.date = req.body.date;
  }

  Usr.findOne( { _id: req.params['id'] },(err,data)=>{
    if (err && err.name != "CastError") {
      // if an error which isn't a cast error -- caused by submitting username not _id
      console.log(err);
      res.status(500).send();
      return;
    }
    if (!!data) {
      data.log.push(ex);
      data.save().then(()=>{
        res.json(data);
      });
    }
    else {
      // try to find the user by username instead
      Usr.findOne({username: req.params['id']},(err,data)=>{
        if (err) {
          console.log(err);
          res.status(500).send();
          return;
        }
        if (!!data) {
          data.log.push(ex);
          data.save().then(()=>{
          res.json(data);
      });
        }
        else {
          res.status(404).send();
        }
      });
    }
  });
});

// route: full log for user
app.get('/api/users/:id/logs',(req,res)=>{
  Usr.findOne( { _id: req.params['id'] },(err,data)=>{
    if (err && err.name != "CastError") {
      // if an error which isn't a cast error -- caused by submitting username not _id
      console.log(err);
      res.status(500).send();
      return;
    }
    if (!!data && !!data.log) {
      res.json(data.log);
    }
    else {
      // try to find the user by username instead
      Usr.findOne({username: req.params['id']},(err,data)=>{
        if (err) {
          console.log(err);
          res.status(500).send();
          return;
        }
        if (!!data.log) {
          res.json(data.log);
        }
        else {
          res.status(404).send();
        }
      });
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
