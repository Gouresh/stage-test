import aws from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3-transform";
import express from "express";
import path from "path";
import sharp from "sharp";
import "dotenv/config";

const app = express();
const port = process.env.port;

app.use(express.static(path.join(path.resolve(), "public")));

aws.config.update({
  secretAccessKey: process.env.secretAccessKey,
  accessKeyId: process.env.accessKeyId,
  region: process.env.region,
});

const s3 = new aws.S3();

const uploadS3 = multer({
  storage: multerS3({
    s3,
    acl: "public-read",
    bucket: process.env.bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    storageClass: "REDUCED_REDUNDANCY",
    shouldTransform: function (req, file, cb) {
        cb(null, /^image/i.test(file.mimetype))
    },
    transforms: [
      {
        id: "original",
        key: function (req, file, cb) {
          cb(null, `${Date.now()}.jpg`);
        },
        transform: function (req, file, cb) {
          console.log(file);
          cb(null, sharp().resize({width:500}));
        },
      },
    ],
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (/^image/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const uploadFilesToS3 = uploadS3.array("avatar");

app.get("/", (req, res) => {
  res.sendFile(path.join(path.resolve(), "public", "upload.html"));
});

app.post("/upload", (req, res) => {
  uploadFilesToS3(req, res, async (err) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    res.status(200).send({ file: req.files[0].transforms[0].location });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
