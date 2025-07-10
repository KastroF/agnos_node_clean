const axios = require("axios");
const User = require("../models/User");
const Notification = require("../models/Notifications"); 
const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');



const MY_PROJECT_ID = "agnos-575eb"; 
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${MY_PROJECT_ID}/messages:send`;

const SERVICE_ACCOUNT_KEY_FILE = './my-service-account.json';


async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const accessToken = await auth.getAccessToken();
  return accessToken;
}

// Fonction pour envoyer une notification push

async function sendPushNotification(token, title, body, badge,  data = {}) {
  try {
    // Obtenir le jeton OAuth 2.0
    const accessToken = await getAccessToken();

    // Construire la charge utile du message
    const messagePayload = {
      validate_only: false,
      message: {
        token,
        notification: {
          title: title,
          body: body,
          
        },
            apns: {
      payload: {
        aps: {
          alert: {
            title: title,
            body: body
          },
          badge
        }
      }
    },
        data: data, // Charge utile personnalisée
      },

    };

    // Envoyer la requête POST
    const response = await axios.post(FCM_ENDPOINT, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Notification envoyée avec succès :', response.data);
    
  } catch (error) {
    console.error('Erreur lors de l’envoi de la notification :', error.response?.data || error.message);
  }
}


exports.addNotification = async (req, res) => {
    
  console.log(req.body);
  
  try{
    
      const user = await User.findOne({_id: req.body._id}); 
    
      const newNotif = new Notification({
        
          title: `Bienvenue sur AGNOS`, 
          body: `Félicitation ${user.name}, votre compte a été approuvé avec succès`, 
          org_id: req.body._id, 
          date: new Date(), 
          fcmToken: user.fcmToken, 
          read: false
      }) 
      
    await newNotif.save(); 
    
     const count = await Notification.countDocuments({org_id: req.body._id, read: false});
    
      console.log(count + " le compte est bon"); 
      
    
    await User.updateOne({_id: req.body._id }, {$set: {active: true}})
    
     const orgs = await User.find({status: "org", active: false}); 
    
     console.log(orgs); 
     console.log(user);
    
    const tokens = user.fcmToken.map(item => {return item.fcmToken});
    
    for(let token of tokens){
      
      
      sendPushNotification(
         token, 
        "Bienvenue sur AGNOS",
        `Félicitation ${user.name}, votre compte a été approuvé avec succès`,
         count, 
        {"badge": `${count}`}
      ).then(() => {
          
        
        
      
      }, (err) => {
        
          console.log(err); 
          res.status(505).json({err})
      })
    
        
    }
    
    
    
  res.status(201).json({status: 0, orgs})
      
    
  }catch(e){
    
    
      res.status(505).json({e})
  }
  
  
}

exports.sendNotification = (req, res) => {
  
  
  console.log("je suis Ok");
 /* 
  try {
  const fileContent = fs.readFileSync(SERVICE_ACCOUNT_KEY_FILE, 'utf-8');
  console.log('Fichier chargé avec succès :', fileContent);
} catch (error) {
  console.error('Erreur lors du chargement du fichier :', error.message);
} */

  User.findOne({ email: "nkastrro@gmail.com" }).then((user) => {
    console.log(user);
    if (user) {
      sendPushNotification(
        user.fcmToken,
        "Bienvenue sur AGNOS",
        `Félicitation ${user.name}, votre compte a été approuvé avec succès`, 
        
      ).then(
        () => {
          res.status(200).json({ status: 0 });
        },
        (err) => {
          res.status(505).json({ err });
        }
      );
    }
  });
  
};
