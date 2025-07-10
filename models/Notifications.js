const mongoose = require("mongoose"); 

const notifSchema = mongoose.Schema({
    
    title: {type: String}, 
    body: {type: String}, 
    org_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
    fcmToken: {type: Array}, 
    date: {type: Date}, 
    read: {type: Boolean}, 
    view: {type: Boolean}, 
    status: {type: String}
    
})


module.exports = mongoose.model("Notification", notifSchema);