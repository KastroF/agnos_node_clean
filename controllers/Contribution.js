const Contribution = require("../models/Contribution");
const Announcement = require("../models/Announcement");
const Token = require("../models/Token");
require("dotenv").config();
const http = require("https");
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const Notification = require("../models/Notifications");
const FIREBASE_API_URL = "https://fcm.googleapis.com/fcm/send";
const { GoogleAuth } = require("google-auth-library");
const fs = require("fs");

exports.getContributions = (req, res) => {
  console.log(req.body);

  const startAt = req.body.startAt ? req.body.startAt : 0;

  Contribution.find({ announcementId: req.body._id, status: "success" })
    .sort({ date: -1 })
    .skip(startAt)
    .limit(10)
    .then(
      (contributions) => {
        res
          .status(200)
          .json({
            status: 0,
            contributions,
            startAt:
              contributions.length === 10 ? parseInt(startAt) + 10 : null,
          });
      },
      (err) => {
        console.log(err);
        res.status(505).json({ err });
      }
    );
};

exports.giveMeMyMoney = async (req, res) => {
  console.log(req.body);

  const idd = new mongoose.Types.ObjectId(req.body._id);

  try {
    await Contribution.updateMany(
      { announcementId: req.body._id, status: "success", paid: "initial" },
      { $set: { paid: "pending", pendingDate: new Date() } }
    );

    let stats = await Contribution.aggregate([
      {
        $match: { announcementId: idd, status: "success", paid: "pending" }, // Filtre par l'ID de l'annonce
      },
      {
        $group: {
          _id: null, // Pas de regroupement par un champ spécifique
          totalAmount: { $sum: "$amount" }, // Somme des champs "amount"
          count: { $sum: 1 }, // Compte le nombre de documents
        },
      },
    ]);

    let stats2 = await Contribution.aggregate([
      {
        $match: { announcementId: idd, status: "success" }, // Filtre par l'ID de l'annonce
      },
      {
        $group: {
          _id: null, // Pas de regroupement par un champ spécifique
          totalAmount: { $sum: "$amount" }, // Somme des champs "amount"
          count: { $sum: 1 }, // Compte le nombre de documents
        },
      },
    ]);

    await Announcement.updateOne(
      { _id: req.body._id },
      { $set: { pending: true } }
    );

    const annonce = await Announcement.findOne({ _id: req.body._id });

    console.log("les stats 1", stats);

    -console.log("les stats 2", stats2);

    if (!stats.length) {
      stats = [{ count: 0, totalAmount: 0 }];
    }

    if (!stats2.length) {
      stats2 = [{ count: 0, totalAmount: 0 }];
    }

    annonce.stats = stats2[0];

    res.status(201).json({ status: 0, annonce, amount: stats[0].totalAmount });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

exports.addVisaPayment = async (req, res) => {
  
  console.log(req.body);

  try {
    let raw;

    const token = await Token.findOne({ id: 1 });

    const myObject = {
      code_marchand: "074810793",
      montant: req.body.amount2,
      reference_marchand: "1234567890",
      numero_client: "074093850",
      token: token.token,
      action: 1,
      service: "REST",
      operateur: "VM",
      agent: "agnos",
    };

    // console.log("le token", myObject);

    raw = JSON.stringify({
      code_marchand: "074810793",
      montant: req.body.amount2,
      reference_marchand: "1234567890",
      numero_client: "074093850",
      token: token.token,
      action: 1,
      service: "REST",
      operateur: "VM",
      agent: "agnos",
    });

    const options = {
      hostname: "mypvitapi.pro", // Replace with your API endpoint https://lab.billing-easy.net/api/v1/merchant/e_bills
      path: "/api/pvit-secure-full-api-v3.kk", // Replace with your API endpoint path
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Accept: "application/json",
        // En-tête d'authentification
        "Content-Length": Buffer.byteLength(raw),
      },
    };

    const sendRequest = (options, data) => {
      return new Promise((resolve, reject) => {
        const req = http.request(options, (ress) => {
          let responseData = "";

          ress.on("data", (chunk) => {
            responseData += chunk;
          });
          ress.on("end", () => {
            resolve(responseData);
          });
        });
        req.on("error", (error) => {
          reject(error);
        });
        req.write(data);
        req.end();
      });
    };

    const curlCommand = `
                  curl -X POST "https://${options.hostname}${options.path}" \\
                  -H "Content-Type: application/json" \\
                  -H "Access-Control-Allow-Origin: *" \\
                  -H "Accept: application/json" \\
                  -d '${raw}'
                  `.trim();

    sendRequest(options, raw)
      .then((responseJson) => {
        console.log("Réponse de l'API :", responseJson);
        // res.status(200).json(JSON.parse(responseJson)); // Retourner la réponse au client
      })
      .catch((error) => {
        console.error("Erreur de requête :", error);
        res
          .status(500)
          .json({
            error: "Erreur lors de la communication avec le serveur distant",
          });
      });
  } catch (err) {
    console.log(err);
  }
};


exports.initMobileMoney = (req, res) => {
  
  console.log("On a initié", req.body);

  const contribution = new Contribution({
    userId: req.auth.userId,
    amount: req.body.amount,
    giverName: req.body.giverName,
    fees: req.body.fees,
    announcementId: req.body._id,
    referenceId: req.body.unique_id,
    timeout: 100000,
    countryCode: req.body.country,
    date: new Date(),
    clientPhone: req.body.client_phone,
    meansOfPayments: req.body.moneyType,
    status: "pending",
    paid: "initial",
  });

  contribution
    .save()
    .then((trans) => {
      console.log(trans);

      const data = JSON.stringify({
        amount: req.body.amount2,
        short_description: "Paiement mobile money d'un de nos utilisateurs ",
        payer_email: "chronickl@test.com",
        payer_name: "Agnos User",
        payer_msisdn: req.body.client_phone,
        external_reference: trans._id,
        expiry_period: 2,
      });

      const username = "chronicklSarl";
      const shared_key = "dfecfc1e-ef0d-45a3-b3c3-e3f5889aa84a";

      //https://www.billing-easy.com/api/v1/merchant/e_bills

      // Request options
      const options = {
        hostname: "stg.billing-easy.com", // Replace with your API endpoint https://lab.billing-easy.net/api/v1/merchant/e_bills
        path: "/api/v1/merchant/e_bills", // Replace with your API endpoint path
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${username}:${shared_key}`
          ).toString("base64")}`, // En-tête d'authentification
          "Content-Length": Buffer.byteLength(data),
        },
      };
    
    
    


      const sendRequest = (options, data) => {
        return new Promise((resolve, reject) => {
          const req = http.request(options, (ress) => {
            let responseData = "";

            ress.on("data", (chunk) => {
              responseData += chunk;
            });
            ress.on("end", () => {
              resolve(responseData);
            });
          });
          req.on("error", (error) => {
            reject(error);
          });
          req.write(data);
          req.end();
        });
      };


    
      sendRequest(options, data)
        .then((responseData) => {
        
            console.log(responseData);
          //console.log(JSON.parse(responseData));
          //console.log(JSON.parse(responseData).e_bill.bill_id);

          Contribution.findOne({ _id: trans._id })
            .then((transact) => {
              if (transact) {
                const bill_id = JSON.parse(responseData).e_bill.bill_id;

                Contribution.updateOne(
                  { _id: transact._id },
                  {
                    $set: {
                      bill_id,
                    },
                  }
                )
                  .then(async () => {
                  
                    console.log(bill_id); 
                    console.log(req.body.moneyType); 
                    console.log(req.body.client_phone);
                  
                  const path = `/api/v1/merchant/e_bills/${bill_id}/ussd_push`;
                  
                  console.log(path);
                  
                      const data2 = JSON.stringify({
                          "payer_msisdn":req.body.client_phone,
                          "payment_system_name" : req.body.moneyType === "AM" ? "airtelmoney" : "moovmoney4"
                        });
                    
                      const options2 = {
                        hostname: "stg.billing-easy.com", // Replace with your API endpoint https://lab.billing-easy.net/api/v1/merchant/e_bills
                        path: path, // Replace with your API endpoint path
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Access-Control-Allow-Origin": "*",
                          Accept: "application/json",
                          Authorization: `Basic ${Buffer.from(
                            `${username}:${shared_key}`
                          ).toString("base64")}`, // En-tête d'authentification
                          "Content-Length": Buffer.byteLength(data2),
                        },
                      };
                  
                  
                      
                  
                  
                      //console.log()
                    
                      sendRequest(options2, data2)
                        .then((responseData) => {
                        
                        console.log((responseData));
                        
                          console.log("Tout s'est bien passé");
                        
                           res.status(201).json({ status: 0, bill_id });
                        
                        
                        
                      }, (error) => {
                          
                          console.log(error);
                         res.status(402).json({ error });
                        
                      })
                    
                  
                   
                  })
                  .catch((error) => {
                    res.status(402).json({ error });
                    console.log(error);
                  });
              }
            })
            .catch((error) => { console.log(error); res.status(402).json({ error })   } );
        })
        .catch((error) => {
          console.error("Erreur de requête :", error);
           res.status(402).json({ error });
        });
    })
    .catch((error) => {
      console.log(error)
      res.status(402).json({ error });
    });
};

exports.initVisa = (req, res) => {
  console.log("On a initié");

  const contribution = new Contribution({
    userId: req.auth.userId,
    amount: req.body.amount,
    giverName: req.body.giverName,
    fees: req.body.fees,
    announcementId: req.body._id,
    referenceId: req.body.unique_id,
    timeout: 100000,
    countryCode: req.body.country,
    date: new Date(),
    clientPhone: req.body.client_phone,
    meansOfPayments: req.body.moneyType,
    status: "pending",
    paid: "initial",
  });

  contribution
    .save()
    .then((trans) => {
      console.log(trans);

      const data = JSON.stringify({
        amount: req.body.amount2,
        short_description: "Paiement visa d'un de nos utilisateurs ",
        payer_email: "chronickl@test.com",
        payer_name: "Agnos User",
        payer_msisdn: "074093850",
        external_reference: trans._id,
        expiry_period: 2,
      });

      const username = "chronicklSarl";
      const shared_key = "dfecfc1e-ef0d-45a3-b3c3-e3f5889aa84a";

      //https://www.billing-easy.com/api/v1/merchant/e_bills

      // Request options
      const options = {
        hostname: "stg.billing-easy.com", // Replace with your API endpoint https://lab.billing-easy.net/api/v1/merchant/e_bills
        path: "/api/v1/merchant/e_bills", // Replace with your API endpoint path
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(
            `${username}:${shared_key}`
          ).toString("base64")}`, // En-tête d'authentification
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const sendRequest = (options, data) => {
        return new Promise((resolve, reject) => {
          const req = http.request(options, (ress) => {
            let responseData = "";

            ress.on("data", (chunk) => {
              responseData += chunk;
            });
            ress.on("end", () => {
              resolve(responseData);
            });
          });
          req.on("error", (error) => {
            reject(error);
          });
          req.write(data);
          req.end();
        });
      };

      sendRequest(options, data)
        .then((responseData) => {
          console.log(JSON.parse(responseData));
          //console.log(JSON.parse(responseData).e_bill.bill_id);

          Contribution.findOne({ _id: trans._id })
            .then((transact) => {
              if (transact) {
                const bill_id = JSON.parse(responseData).e_bill.bill_id;

                Contribution.updateOne(
                  { _id: transact._id },
                  {
                    $set: {
                      bill_id,
                    },
                  }
                )
                  .then(() => {
                    res.status(201).json({ status: 0, bill_id, paymentId: trans._id });
                  })
                  .catch((error) => {
                    res.status(402).json({ error });
                    console.log(error);
                  });
              }
            })
            .catch((error) => res.status(402).json({ error }));
        })
        .catch((error) => {
          console.error("Erreur de requête :", error);
        });
    })
    .catch((error) => {
      res.status(402).json({ error });
    });
};

exports.ebillingCallback = async (req, res) => {
  console.log("c'est le retour Ebilling", req.body);

  try {
    await Contribution.updateOne(
      { _id: req.body.reference },
      { $set: { status: "success" } }
    );
    
      const contribution = await Contribution.findOne({_id: req.body.reference})
      const user = await User.findOne({_id: contribution.userId}); 
    
     
   if(1){
       
      const newNotif = new Notification({
        
          title: `Félicitatios`, 
          body: `Votre transaction s'est effectuée avec succès. Merci pour votre geste.`, 
          org_id: user._id, 
          date: new Date(), 
          fcmToken: user.fcmToken, 
          read: false
      }) 
      
    await newNotif.save(); 
    
    const count = await Notification.countDocuments({org_id: user._id, read: false});
     
    const tokens = user.fcmToken.map(item => {return item.fcmToken});
    
    for(let token of tokens){
      
      
      sendPushNotification(
         token, 
        `Félicitatios`, 
        `Votre transaction s'est effectuée avec succès. Merci pour votre geste.`, 
         count, 
        {"badge": `${count}`, transaction: "true"}
      ).then(() => {
          
        
        
      
      }, (err) => {
        
          console.log(err); 
          res.status(505).json({err})
      })
    
        
    }
   }
     res.status(201).json({status: 0});
    
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

exports.addContribution = async (req, res) => {
  let api_gab;

  console.log("comment comment ?", req.body);

  if (req.body.countryCode === "GA") {
    api_gab = process.env.mypay_ga;
  }

  if (req.body.countryCode === "SN") {
    api_gab = process.env.mypay_sn;
  }

  if (req.body.moneyType === "card") {
    api_gab = process.env.mypay_ga;
  }

  // console.log("la clé de l'api", process.env.mypay_ga);

  try {
    const contribution = new Contribution({
      userId: req.auth.userId,
      amount: req.body.amount,
      giverName: req.body.giverName,
      fees: req.body.fees,
      announcementId: req.body._id,
      referenceId: req.body.unique_id,
      timeout: 100000,
      countryCode: req.body.country,
      date: new Date(),
      clientPhone: req.body.client_phone,
      meansOfPayments: req.body.moneyType,
      status: "pending",
      paid: "initial",
    });

    const idd = await contribution.save().then((cont) => {
      return cont._id;
    });

    let raw;

    raw = JSON.stringify({
      urls: {
        success_url: "http://chronickl-response.epizy.com/success.html",
        callback_url:
          "https://users-auth.glitch.me/api/contribution/mypaygacallback",
        fail_url: "http://chronickl-response.epizy.com/echec.html",
      },
      apikey: api_gab,
      client_phone:
      req.body.moneyType === "card" ? "070000001" : req.body.client_phone,
      amount: req.body.amount2,
      country: req.body.moneyType === "card" ? "GA" : req.body.countryCode,
      network: req.body.moneyType,
      type: req.body.moneType === "card" ? "card" : "mobile_money",
      unique_id: req.body.unique_id,
      OTP: req.body.OTP,
      firstname: "Prenom",
      lastname: "Nom",
      email: "email@gmail.com",
    });

    const options = {
      hostname: "api.mypayga.com", // Replace with your API endpoint https://lab.billing-easy.net/api/v1/merchant/e_bills
      path: "/v1/payment", // Replace with your API endpoint path
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Accept: "application/json",
        // En-tête d'authentification
        "Content-Length": Buffer.byteLength(raw),
      },
    };

    const sendRequest = (options, data) => {
      return new Promise((resolve, reject) => {
        const req = http.request(options, (ress) => {
          let responseData = "";

          ress.on("data", (chunk) => {
            responseData += chunk;
          });
          ress.on("end", () => {
            resolve(responseData);
          });
        });
        req.on("error", (error) => {
          reject(error);
        });
        req.write(data);
        req.end();
      });
    };

    sendRequest(options, raw)
      .then((responseJson) => {
        console.log("le dingue", JSON.parse(responseJson));

        Contribution.updateOne(
          { _id: idd },
          { $set: { payment_token: JSON.parse(responseJson).payment_token } }
        ).then(
          () => {
            res
              .status(200)
              .json({
                status: 0,
                payment_url: JSON.parse(responseJson).checkout_url,
                waveUrl: JSON.parse(responseJson).wave_launch_url
                  ? JSON.parse(responseJson).wave_launch_url
                  : "",
              });
          },
          (error) => {
            console.error("Erreur de requête :", error);
            res.status(402).json({ error });
          }
        );
      })
      .catch((error) => {
        console.error("Erreur de requête :", error);
        res.status(402).json({ error });
      });
  } catch (err) {
    console.log(err);
    res.status(505).json({ err });
  }
};

const MY_PROJECT_ID = "agnos-575eb";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${MY_PROJECT_ID}/messages:send`;

const SERVICE_ACCOUNT_KEY_FILE = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const accessToken = await auth.getAccessToken();
  return accessToken;
}

async function sendPushNotification(token, title, body, badge, data = {}) {
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
                body: body,
              },
              badge,
            },
          },
        },
        data: data, // Charge utile personnalisée
      },
    };

    // Envoyer la requête POST
    const response = await axios.post(FCM_ENDPOINT, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Notification envoyée avec succès :", response.data);
  } catch (error) {
    console.error(
      "Erreur lors de l’envoi de la notification :",
      error.response?.data || error.message
    );
  }
}

exports.mypaygaCallback = (req, res) => {
  console.log("Mypayga reviens", req.body);

  Contribution.updateOne(
    { payment_token: req.body.payment_token },
    { $set: { status: parseInt(req.body.order_status) === 200 ? "success" : "failed" } }
  ).then(
    async () => {
      try {
        const contribution = await Contribution.findOne({
          payment_token: req.body.payment_token,
        });
        const user = await User.findOne({ _id: contribution.userId });
        
        console.log("la contribution", contribution);
        console.log("l'utilisateur", user);

        if (parseInt(req.body.order_status) === 200 && contribution.status === "pending") {
          
          
          const newNotif = new Notification({
            title: `Félicitatios`,
            body: `Votre transaction s'est effectuée avec succès. Merci pour votre geste.`,
            org_id: user._id,
            date: new Date(),
            fcmToken: user.fcmToken,
            read: false,
          });

          await newNotif.save();

          const count = await Notification.countDocuments({
            org_id: user._id,
            read: false,
          });
          
      

          const tokens = user.fcmToken.map((item) => {
            return item.fcmToken;
          });
          
            console.log(tokens);

          for (let token of tokens) {
            sendPushNotification(
              token,
              `Félicitatios`,
              `Votre transaction s'est effectuée avec succès. Merci pour votre geste.`,
              count,
              { badge: `${count}`, transaction: "true" }
            ).then(
              () => {},
              (err) => {
                console.log(err);
                res.status(505).json({ err });
              }
            );
          }
        }
        res.status(201).json({ status: 0 });
      } catch (err) {
        console.log(err);
        res.status(505).json({});
      }
    },
    (err) => {
      console.log(err);
      res.status(505).json({ err });
    }
  );

  // console.log(req.body);
};

exports.myPvitCallback = (req, res) => {
  console.log("c'est le retour pvit", req.body);
};

exports.getStats = async (req, res) => {
  try {
    const announcementId = req.body._id;

    console.log("le body", announcementId);

    const stats = await Contribution.aggregate([
      {
        $match: { announcementId, status: "success" }, // Filtre par l'ID de l'annonce
      },
      {
        $group: {
          _id: null, // Pas de regroupement par un champ spécifique
          totalAmount: { $sum: "$amount" }, // Somme des champs "amount"
          count: { $sum: 1 }, // Compte le nombre de documents
        },
      },
    ]);

    // Si aucun résultat trouvé, renvoie des valeurs par défaut
    if (!stats.length) {
      return res.status(200).json({ count: 0, totalAmount: 0 });
    }

    // Renvoie les statistiques
    // console.log(stats[0]);
    res.status(200).json(stats[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
