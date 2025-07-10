const mongoose = require("mongoose"); 


const AnnouncementSchema = mongoose.Schema({
    
  title: {type: String}, 
  description: {type: String},
  imageUrl: {type: String},
  date: {type: Date}, 
  active: {type: Boolean}, 
  userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
  created_date: {type: Date}, 
  user: {type: Object},
  stats : {type: Object}, 
  pending: {type: Boolean}
})


module.exports = mongoose.model("Announcement", AnnouncementSchema);