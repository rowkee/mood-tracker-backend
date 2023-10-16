//* Config and Setup

import express, { Router } from "express";
import serverless from "serverless-http";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose, { Schema, now } from "mongoose";
import 'dotenv/config'

const api = express()
api.use(cors())
api.use(bodyParser.json())
const port = process.env.PORT || 4000
api.listen(port, () => {
    console.log(`listening on port: ${port}`);
})


export const handler = serverless(api);
const router = Router();
router.get("/hello", (req, res) => res.send("Hello World!"));

api.use("/api/", router);



// This connects Mongoose to the project
mongoose.connect(`${process.env.DATABASE_URL}`);


// * Auth Code
const userSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        require: true
    },
    lastLogin: {
        type: Date,
        require: true
    },
})

const User = mongoose.model('User', userSchema)

api.post('/login', async (req, res) => {
  try {
      const now = new Date()
      if (await User.count({ 'userEmail': req.body.email }) === 0) {
        const newUser = new User({ userEmail: req.body.email, lastLogin: now })
        await newUser.save()
        return res.status(200).json(newUser)
      } else {
        await User.findOneAndUpdate({ userEmail: req.body.email }, { lastLogin: now })
        return res.status(200)
      }
    } catch (err) {
      console.log(err.message)
    }
  })


// * Mongod Schemas

const weatherSchema = new mongoose.Schema ({
  locationName: String,
  locationLocaltime: String,
  currentConditionText: String,
  currentIcon: String,
  currentCode: String
})

const newWeather = mongoose.model('newWeather', weatherSchema)

const entrySchema = new mongoose.Schema ({
  name:  String,
  entryDate: Date,
  lifeWork: Number,
  lifeFamily: Number,
  lifeFriends: Number,
  lifeFinances: Number,
  mindMood: Number,
  mindStress: Number,                   
  mindWorry: Number,
  mindControl: Number,
  mindOptimism: Number,                    
  activityExercise: Number,
  activityHabits: Number,
  activityDrugs: Number,
  notes: String,
  user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
  weather: {type: mongoose.Schema.Types.ObjectId, ref:'newWeather'}
})

const newEntry = mongoose.model('newEntry', entrySchema)

// * Code for an entry AND fetching the weather

api.post('/entry/add', async (req, res) => {
  let weatherLocation ={}
  let weatherCurrent = {}
  fetch(`https://api.weatherapi.com/v1/current.json?q=London&key=${process.env.WEATHER_KEY}`)
  .then (result => result.json())
  .then (data => {
    weatherLocation = data.location
    weatherCurrent = data.current.condition
    const weather = new newWeather ({
      locationName: weatherLocation.name,
      locationLocaltime: weatherLocation.localtime,
      currentConditionText: weatherCurrent.text,
      currentIcon: weatherCurrent.icon,
      currentCode: weatherCurrent.code
    })
   weather.save()
   .then (async () => {
      try {
        const now = new Date()
        const user = await User.findOne({userEmail: req.body.email})
        const newEntryForDb = new newEntry ({
          name: req.body.name,
          user: user,
          entryDate: now,
          lifeWork: req.body.lifeWork,
          lifeFamily: req.body.lifeFamily,
          lifeFriends: req.body.lifeFriends,
          lifeFinances: req.body.lifeFinances,
          mindMood: req.body.mindMood,
          mindStress: req.body.mindStress,          
          mindWorry: req.body.mindWorry,
          mindControl: req.body.mindControl,
          mindOptimism: req.body.mindOptimism,          
          activityExercise: req.body.activityExercise,
          activityHabits: req.body.activityHabits,
          activityDrugs: req.body.activityDrugs,
          notes: req.body.notes,
          weather: weather
        })
        await newEntryForDb.save()
        return res.status(200).json(newEntryForDb)
      }
      catch (err) {
        console.log(err.message)
      }
    })
  })
})

api.get('/entry/list/:userEmail', async (req,res)=> {
  const email = req.params.userEmail
  // console.log(userEmail);
  const userID = await User.findOne({userEmail: email}).select('_id')
  // console.log(userID);
  const userEntries = await newEntry.find({user: userID})
  return res.json(userEntries)
})

api.get('/entry/list/edit/:entryId', async (req,res)=> {
  const entryId = req.params.entryId
  const userEntry = await newEntry.findById(entryId)
  return res.json(userEntry)
})

api.put('/entry/list/edited/:entryId', async (req, res) => {
  try {
    const entryId = req.params.entryId
    const entryToUpdate = await newEntry.findById(entryId)
    entryToUpdate.set(req.body)
    await entryToUpdate.save()
    return res.status(202).json(entryToUpdate)
  } 
  catch (error) {
    console.log(error.message);
  }
})

api.delete('/entry/list/delete/:entryId', async (req, res) => {
  try {
    const entryId = req.params.entryId
    newEntry.deleteOne({'_id': entryId})
    .then (()=> {
      return res.status(200).json({message: 'Successfully Deleted'})
    })
    .catch (error => console.error(error))
  }
  catch (error) {
    console.log(error.message);
  }
})

api.get('/weather', async (req,res)=> {
  const weather = await newWeather.find({})
  return res.json(weather)
})