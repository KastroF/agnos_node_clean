const express = require("express"); 
const mongoose = require("mongoose");

const fs = require("fs");
const cors = require('cors');
const path = require("path");
const requestMap = new Map();


const app = express();
app.use(cors());

app.use(express.json({limit: "50mb"})); 
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    next();
  });

mongoose.connect("mongodb+srv://chronicklsarl89:sY1q7qgyb0TjBR3C@cluster0.rly8l.mongodb.net/agnos?retryWrites=true&w=majority",

  { useNewUrlParser: true,
    useUnifiedTopology: true, autoIndex: true })
  .then(() => {
  
  
  console.log('Connexion à MongoDB réussie !'); 
     
              
              }) 

  .catch(() => console.log('Connexion à MongoDB échouée !'));



app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'];
    if (requestId && requestMap.has(requestId)) {
        return res.status(400).send('Duplicate request');
    }
    if (requestId) {
        requestMap.set(requestId, true);
        setTimeout(() => requestMap.delete(requestId), 60000); // Cleanup after 1 minute
    }
    next();
});

  const userRouter = require("./routes/User");
  const notifRouter = require("./routes/Notifications");
  const announcementRouter = require("./routes/Announcement"); 
  const contributionRouter = require("./routes/Contribution"); 
  

  app.use("/api/user", userRouter);
  app.use("/images", express.static(path.join(__dirname, "images")));
  app.use("/api/notif", notifRouter);
  app.use("/api/announcement", announcementRouter);
  app.use("/api/contribution", contributionRouter)


module.exports = app;