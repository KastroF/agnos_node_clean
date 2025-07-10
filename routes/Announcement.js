
const express = require("express"); 

const router = express.Router(); 

const multer = require("../middleware/multer-config"); 

const announcementCtrl = require("../controllers/Announcement"); 

const auth = require("../middleware/auth")

router.post("/addnew", auth, multer, announcementCtrl.addNew); 
router.post("/getannonces", auth, announcementCtrl.getAnnonces);
router.post('/getannonce', auth, announcementCtrl.getAnnonce);
router.post("/modify", auth, multer, announcementCtrl.toModifyAnnonce); 
router.post("/search", auth, announcementCtrl.search); 
router.post("/byorg", auth, announcementCtrl.getAnnouncementsByOrg)

module.exports = router; 