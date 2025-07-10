const mongoose = require("mongoose"); 


const tokenSchema = mongoose.Schema({
      
      token: {type: String}, 
      id: {type: Number}
})

module.exports = mongoose.model("Token", tokenSchema); 