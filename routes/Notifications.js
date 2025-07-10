const express = require("express"); 

const router = express.Router(); 

const notifCtrl = require("../controllers/Notifications"); 

router.post("/", notifCtrl.sendNotification);
router.post("/addnotif", notifCtrl.addNotification);

module.exports = router; 