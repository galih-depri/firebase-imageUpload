const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const app = express();
const firebase = require('firebase')
const firebaseStorage = require('firebase/storage');
const BusBoy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");
const firebaseConfig = require('./config/firebaseConfig');

admin.initializeApp()


const db = admin.firestore();


app.post('/upload/:doc_id', (req, res) => {
    const busboy = new BusBoy({ headers: req.headers });
    const doc_id = req.params.doc_id;
    let imageToBeUploaded = {};
    let imageFileName;

  
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split(".")[filename.split(".").length - 1];
      // 32756238461724837.png

      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;

      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            },
          },
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}`;
          return db.collection('clients').doc(`${doc_id}`).update({ imageUrl });
        })
        .then(() => {
          return res.status(201).json({ message: "Image uploaded successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "something went wrong" });
        });
    });
    busboy.end(req.rawBody);
    
});
  

exports.api = functions.https.onRequest(app);