const mongoose = require("mongoose"); 

const userSchema = mongoose.Schema({
  
  name: {type: String}, 
  email: {type: String}, 
  password: {type: String}, 
  profile: {type: String}, 
  app: {type: String}, 
  status: {type: String}, 
  sigle: {type: String}, 
  active: {type: Boolean},
  userActive: {type: Boolean},
  fcmToken: {type: Array},
  description: {type: String},
  phone: {type: String}, 
  certified: {type: Boolean}, 
  appleId: {type: String}
                                   
})

module.exports = mongoose.model('User', userSchema)