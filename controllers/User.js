const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const https = require('https');

exports.saveUserFCMToken = async (req, res) => {
  
 console.log("on save non ? Parce que l'on passe toujours ici" + req.body)
  
  try{
    
    const user = await  User.findOne(
    { _id: req.auth.userId }); 
    
    const tokens = user.fcmToken.length > 0 ? user.fcmToken : []; 
    
    console.log("les tokes", tokens)
    
    
    if(tokens.filter(item => item.deviceId === req.body.deviceId).length === 0){
      
      
          tokens.push({fcmToken: req.body.fcmToken, deviceId: req.body.deviceId}); 
       
    }
    
    
   const tokenToUpdate = tokens.find(item => item.deviceId === req.body.deviceId);

      if (tokenToUpdate && tokenToUpdate.fcmToken !== req.body.fcmToken) {
        tokenToUpdate.fcmToken = req.body.fcmToken;
      }

    
      User.updateOne(
    { _id: req.auth.userId },
    { $set: { fcmToken: tokens} }
  ).then(
    () => {
      res
        .status(200)
        .json({ status: 0, message: "Mise à jour effectuée avec succès" });
    },
    (err) => {
      res.status(505).json({ err });
    }
  );
    
    
  }catch(e){
      
    res.status(505).json({ err: e });
  }
  

};


exports.deleteUser = (req, res) => {
    
      User.updateOne({_id: req.auth.userId}, {$set: {userActive: false}}).then(() => {
        
        res.status(201).json({status: 0});
        
      }, (err) => {
        
          console.log(err); 
          res.status(505).json({err})
      })
}


exports.signIn = async (req, res) => {
  console.log(req.body)
  try {
    
    User.findOne({ email: req.body.email, userActive: true }).then(
      async (user) => {
        
        if (user) {
          
          console.log(user);
          
         // const hash = await bcrypt.hash(req.body.password, 10);
          
         // await User.updateOne({_id: user._id}, {$set: {password: hash}});
          
          const compare = await bcrypt.compare(
            req.body.password,
            user.password
          );

          if (compare) {
            res
              .status(200)
              .json({
                status: 0,
                user,
                token: jwt.sign(
                  { userId: user._id },
                  "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
                ),
              });
          } else {
            res
              .status(200)
              .json({ status: 2, message: "Email ou mot de passe incorrect" });
          }
        } else {
             console.log("pas de user tu es fou");
            res.status(200)
            .json({ status: 2, message: "Email ou mot de passe incorrect" });
        }
      },
      (err) => {
        console.log(err);
        res.status(505).json({ error: err });
      }
    );
  } catch (e) {}
};

exports.signUp = async (req, res) => {
  
  try {
    console.log("Je suis même là", req.body);
    let newUser;

    if (req.body.type === "google") {
      const user = await User.findOne({ email: req.body.email });

      if (user) {
        
        if(user.userActive){
          
        console.log("on est ok");
        res
          .status(201)
          .json({
            status: 0,
            user,
            token: jwt.sign(
              { userId: user._id },
              "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
            ),
          });
          
        }else{
          
           res.status(200)
            .json({ status: 2, message: "Email ou mot de passe incorrect" });
        }
        

      } else {
        console.log("on n'est pas ok");

        const hash = await bcrypt.hash(req.body.password, 10);

        newUser = new User({
          name: req.body.name,
          email: req.body.email,
          password: hash,
          profile: req.body.photo,
          status: "pers",
          active: true,
          userActive: true
        });

        newUser
          .save()
          .then(async (userr) => {
            const lastUser = await User.findOne({ _id: userr._id });

            res
              .status(201)
              .json({
                status: 0,
                user: lastUser,
                token: jwt.sign(
                  { userId: userr._id },
                  "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
                ),
              });
          })
          .catch((error) => {
            res.status(402).json({ status: 505, error: error.message });

            console.log(error);
          });
      }
    } else if (req.body.type === "apple") {
      
      
      const user = await User.findOne({ email: req.body.email });

      if (user) {
        
        if(user.userActive){
          
        if(!user.appleId){
          
            await User.updateOne({_id: user._id}, {$set: {appleId: req.body.appleId}})
        }
          
        console.log("on est ok");
        res
          .status(201)
          .json({
            status: 0,
            user,
            token: jwt.sign(
              { userId: user._id },
              "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
            ),
          });
          
        }else{
          
           res.status(200)
            .json({ status: 2, message: "Email ou mot de passe incorrect" });
        }
        

      } else {
        console.log("on n'est pas ok");

        const hash = await bcrypt.hash(req.body.password, 10);

        newUser = new User({
          name: req.body.name,
          email: req.body.email,
          appleId: req.body.appleId,
          password: hash,
          status: "pers",
          active: true,
          userActive: true
        });

        newUser
          .save()
          .then(async (userr) => {
            const lastUser = await User.findOne({ _id: userr._id });

            res
              .status(201)
              .json({
                status: 0,
                user: lastUser,
                token: jwt.sign(
                  { userId: userr._id },
                  "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
                ),
              });
          })
          .catch((error) => {
            res.status(402).json({ status: 505, error: error.message });

            console.log(error);
          });
      }
      
      
      
    } else {
      const user = await User.findOne({ email: req.body.email });

      if (user) {
        res
          .status(200)
          .json({ status: 2, message: "Adresse email déjà utilisée" });
      } else {
        const hash = await bcrypt.hash(req.body.password, 10);

        newUser = new User({
          name: req.body.name,
          email: req.body.email,
          description: req.body.description,
          phone: req.body.phone,
          password: hash,
          status: req.body.status,
          active: req.body.status === "org" ? false : true,
          userActive: true
        });

        newUser
          .save()
          .then(async (userr) => {
            const lastUser = await User.findOne({ _id: userr._id });

            res
              .status(201)
              .json({
                status: 0,
                user: lastUser,
                token: jwt.sign(
                  { userId: userr._id },
                  "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
                ),
              });
          })
          .catch((error) => {
            res.status(402).json({ status: 505, error: error.message });

            console.log(error);
          });
      }
    }
  } catch (e) {
    console.log(e);

    res.status(505).json({ err: e });
  }
};


exports.connectWithApple = (req, res) => {



    User.findOne({appleId: req.body.user}).then((user) => {

        if(user){


            if(user.userActive){
            
                console.log("on est ok");
                res
                  .status(201)
                  .json({
                    status: 0,
                    user,
                    token: jwt.sign(
                      { userId: user._id },
                      "JxqKuulLNPCNfaHBpmOoalilgsdykhgugdolhebAqetflqRf"
                    ),
                  });
                  
                }else{
                  
                   res.status(200)
                    .json({ status: 2, message: "Email ou mot de passe incorrect" });
                }


        }else{

            res.status(200)
            .json({ status: 2, message: "Email ou mot de passe incorrect" });

        }

    }, (err) => {

            console.log(err); 
            res.status(505).json({err});
    })
}

exports.getPendings  = (req, res) => {
  
    User.find({active: false, status: "org"}).then((orgs) => {
      
      res.status(200).json({orgs, status: 0});
        
    }, (err) => {
        
        console.log(err); 
        res.status(505).json({err})
    })
}


exports.getUser = (req, res) => {
  
  //console.log("Yes");
  https.get('https://api.ipify.org?format=json', (res) => {
    
  let data = '';
    
  res.on('data', (chunk) => {
    
    data += chunk;
    
  });
  res.on('end', () => {
    console.log('Adresse IP publique visible :', JSON.parse(data).ip);
  });
}).on('error', (err) => {
  console.error('Erreur :', err.message);
});
  
    User.findOne({_id: req.auth.userId}).then((user) => {
      
      
      console.log(user);
        res.status(200).json({user, status: 0}); 
      
      
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}

exports.removeFcmToken = async (req, res) => {
  
  try{
    
    console.log(req.body);
    
    const user = await User.findOne({_id: req.auth.userId}); 
    
    const tokens = user.fcmToken.filter(item => item.deviceId !== req.body.deviceId); 
    
    if(req.body.value){
      
       await User.updateOne({_id: req.auth.userId}, {$set: {fcmToken: tokens, userActive: false}});
      
    
    }else{
      
       await User.updateOne({_id: req.auth.userId}, {$set: {fcmToken: tokens}});
    }
    
   
    
    res.status(201).json({status: 0});
    
  }catch(e){
    
      console.log(e); 
      res.status(505).json({err: e})
  }
    
}

exports.updateUser = (req, res) => {
  
    User.updateOne({_id: req.auth.userId}, {$set: {active: true}}).then(async () => {
      
        const user = await User.findOne({_id:  req.auth.userId});
      
        res.status(200).json({status: 0, user})
          
    }, (err) => {
      
        res.status(505).json({err})
    })
}