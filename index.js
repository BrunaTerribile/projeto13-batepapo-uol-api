import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient
    .connect()
    .then(() => {
        db = mongoClient.db("test");
    })
    .catch((err) => console.log(err));


app.listen(5000, () => console.log("Server running in port: 5000"));