
const express = require("express"); 

const router = express.Router(); 

const multer = require("../middleware/multer-config"); 

const userCtrl = require("../controllers/User"); 

const auth = require("../middleware/auth")

router.post("/signup", userCtrl.signUp); 
router.post("/signin", userCtrl.signIn);
router.post("/fcmtoken", auth, userCtrl.saveUserFCMToken);
router.get("/getpending", userCtrl.getPendings);
router.get("/getuser", auth, userCtrl.getUser);
router.post("/removefcmtoken", auth, userCtrl.removeFcmToken); 
router.get("/updateuser", auth, userCtrl.updateUser);
router.get("/deleteuser", auth, userCtrl.deleteUser);
router.post("/connectwithapple", userCtrl.connectWithApple);



module.exports = router; 