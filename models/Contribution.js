const mongoose = require("mongoose");

const contributionSchema = mongoose.Schema({
  
    countryCode: {type: String}, 
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},  
    amount: {type: Number},
    fees: {type: Number}, 
    announcementId: {type: mongoose.Schema.Types.ObjectId, ref: "Announcement"}, 
    meansOfPayments: {type: String}, 
    referenceId: {type: String},
    giverName: {type: String},
    timeout: {type: Number},  
    date: {type: Date},
    paid: {type: String},
    clientPhone: {type: String},
    status: {type: String},
    payment_token:  {type: String}, 
    pendingDate: {type: Date}, 
    bill_id:  {type: String}, 
})

const addContribution = (req, res) => {
  
    
}

module.exports = mongoose.model("Contribution", contributionSchema);