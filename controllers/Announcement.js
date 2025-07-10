const Announcement = require("../models/Announcement"); 
const User = require("../models/User"); 
const {getStats} = require("./Contribution"); 
const mongoose = require("mongoose");

async function searchAnnouncements(text, startAt) {
  console.log('Recherche pour le texte :', text);

  try {
    const batchSize = 50; // Taille du lot pour éviter de charger trop de données
    const results = []; // Stocker les résultats correspondants
    let processed = 0; // Nombre total d'annonces déjà traitées

    while (results.length < 10) {
      // Récupérer un lot d'annonces à partir de l'index courant
      const announcements = await Announcement.find({})
        .populate({
          path: 'userId', // Charger les utilisateurs liés
          select: 'name sigle certified', // On récupère uniquement ces champs
        })
        .sort({ date: -1 }) // Trier par date descendante
        .skip(startAt + processed) // Commencer après les annonces déjà traitées
        .limit(batchSize) // Charger un lot
        .lean(); // Renvoie des objets JS purs

      // Si aucun lot n'est retourné, arrêter la recherche
      if (announcements.length === 0) break;

      // Filtrer les annonces correspondantes
      const matchingAnnouncements = announcements.filter((announcement) => {
        const matchesAnnouncement = [announcement.title, announcement.description].some((field) =>
          field && field.match(new RegExp(text, 'i')) // Vérifier title ou description
        );

        if (matchesAnnouncement) return true;

        // Vérifier dans l'utilisateur si l'annonce ne correspond pas
        const user = announcement.userId;
        if (user) {
          return [user.name, user.sigle].some((field) =>
            field && field.match(new RegExp(text, 'i')) // Vérifier name ou sigle
          );
        }

        return false; // Passer à l'annonce suivante si rien ne match
      });

      // Ajouter les annonces correspondantes au résultat final
      results.push(...matchingAnnouncements);

      // Compter le nombre d'annonces traitées
      processed += announcements.length;

      // Si le nombre d'annonces correspondantes est suffisant, arrêter
      if (results.length >= 10) break;
    }

    // Limiter à 10 résultats pour cette requête
    const limitedResults = results.slice(0, 10);

    // Calculer le nouvel index pour le prochain startAt
    const newStartAt = processed + startAt; // Compte total des annonces déjà parcourues

    return {
      results: limitedResults, // Les annonces correspondant à la recherche
      nextStartAt: results.length < 10 ? null : newStartAt, // S'il reste des résultats
    };
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
    throw error;
  }
}

exports.search = async (req, res) => {
  
  try{
    
      const startAt = req.body.startAt ? req.body.startAt : 0;
      
      const results = await searchAnnouncements(req.body.text, startAt); 
    
      const leResultat = results.results.map(item => {
        
          const user = item.userId; 
          delete item.userId; 
        
          return {user, ...item}
      })
      
      const laFinale = [leResultat, {nextStartAt: results.nextStartAt} ]
    
      console.log("les resultats", laFinale);
    
      res.status(200).json({results: laFinale, status: 0}); 
      
    
  }catch(err){
    
      console.log(err); 
      res.status(505).json({err})
  }
    
}

exports.addNew = async (req, res) => {
  try {
    const imageUrl = req.file?.path || '';

    const newAnnouncement = new Announcement({
      title: req.body.title,
      description: req.body.description,
      imageUrl: imageUrl,
      date: req.body.date,
      userId: req.auth.userId,
      active: true,
      created_date: new Date(),
    });

    await newAnnouncement.save();

    const annonces = await Announcement.find({ active: true }).sort({ date: -1 }).limit(10);

    for (let annonce of annonces) {
      annonce.user = await User.findOne({ _id: annonce.userId });

      const getStatsReq = { body: { _id: annonce._id } };
      const getStatsRes = {
        status: (code) => ({
          json: (data) => {
            if (code === 200) return data;
            else throw new Error(data.error || 'Something went wrong');
          },
        }),
      };

      annonce.stats = await getStats(getStatsReq, getStatsRes);
    }

    res.status(200).json({ status: 0, annonces });
  } catch (err) {
    console.error(err);
    res.status(505).json({ err });
  }
};

exports.toModifyAnnonce = async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.file);

    let body = {};

    if (req.body.title) {
      body.title = req.body.title;
    }

    if (req.body.description) {
      body.description = req.body.description;
    }

    if (req.body.date) {
      body.date = req.body.date;
    }

    if (req.file) {
      // Si Cloudinary est utilisé via multer-storage-cloudinary, l'URL publique est dans req.file.path
      body.imageUrl = req.file.path;
    }

    if (Object.keys(body).length > 0) {
      await Announcement.updateOne({ _id: req.body._id }, { $set: body });

      const annonce = await Announcement.findOne({ _id: req.body._id });
      annonce.user = await User.findOne({ _id: annonce.userId });

      const getStatsReq = { body: { _id: annonce._id } };
      const getStatsRes = {
        status: (code) => ({
          json: (data) => {
            if (code === 200) {
              return data;
            } else {
              throw new Error(data.error || 'Something went wrong');
            }
          },
        }),
      };

      annonce.stats = await getStats(getStatsReq, getStatsRes);

      console.log(annonce);
      return res.status(200).json({ status: 0, annonce });
    } else {
      return res.status(200).json({ status: 0 });
    }
  } catch (e) {
    console.log(e);
    return res.status(505).json({ err: e });
  }
};


exports.getAnnonces = (req, res) => {
  
    console.log("est ce que tu vois ?")
  
   
  
    Announcement.find({active: true}).sort({date: -1}).skip(req.body.startAt).limit(10).then(async (annonces) => {
      
       for(let annonce of annonces){

           annonce.user = await User.findOne({_id: annonce.userId}); 
         
            const getStatsReq = {
              body: {
                _id: annonce._id
              }
            }
            
            const getStatsRes = {
              
              status: (code) => ({
                json: (data) => {
                  if (code === 200) {
                    // Capture les données de getStats
                    annonce.stats = data;
                    return data;
                  } else {
                    throw new Error(data.error || 'Something went wrong');
                  }
                },
              }),
            }
            
            
             
          
        }
      
      res.status(200).json({status: 0, annonces, startAt: annonces.length === 10 ? parseInt(req.body.startAt) + 10 : null});
        
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err})
    })
}



exports.getAnnonce = async (req, res) => {
  
  
  console.log(req.body._id);
  
    try{
      
      let _id; 
      
      if(mongoose.Types.ObjectId.isValid(req.body._id)){
        
          _id = req.body._id
      
      }else{
        
        _id = mongoose.Types.ObjectId(req.body._id);
          
      }
      
      //console.log("c'est ça l'id", _id);
      
      const annonce = await Announcement.findOne({_id: req.body._id}); 
      
      annonce.user = await User.findOne({_id: annonce.userId}); 
      
       const getStatsReq = {
              body: {
                _id: annonce._id
              }
            }
            
            const getStatsRes = {
              
              status: (code) => ({
                
                json: (data) => {
                 // console.log("les autres, sont là "+ code, data);
                  if (code === 200) {
                    // Capture les données de getStats
                    console.log("les autres, sont là", data);
                    
                    //return data;
                    annonce.stats = data;
                    
                    if(annonce.active){
                      
                        res.status(200).json({status: 0, annonce});
                        
                    }else{
                      
                        res.status(200).json({status: 1, message: "Cet appel d'offre a été désactivé !"});
                    }
                    
                  
                    
                  } else {
                    
                    throw new Error(data.error || 'Something went wrong');
                    res.status(505).json({err: data.error})
                  }
                },
              }),
            }
            
            
            getStats(getStatsReq, getStatsRes);
             
      

      
    }catch(e){
      
        console.log(e); 
        res.status(505).json({err:e})
    }
}

exports.getAnnouncementsByOrg = (req, res) => {
  
    console.log(req.body);
  
    const startAt = req.body.startAt ? req.body.startAt : 0;
  
    Announcement.find({userId: req.body._id, active: true }).sort({date: -1}).skip(startAt).limit(10).then((annonces) => {
      
        console.log(annonces);
     
        res.status(200).json({status: 0, annonces, startAt: annonces.length == 10 ? parseInt(startAt) + 10 : null})
      
    }, (err) => {
      
        console.log(err); 
        res.status(505).json({err});
    })
}