import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import joi from 'joi'
import dayjs from 'dayjs';

const nameSchema = joi.object({
    name: joi.string()
})

const messageSchema = joi.object({
    from: joi.string(),
    to: joi.string(),
    text: joi.string(),
    type: joi.string(),
})

let now = dayjs().locale('pt-br').format('HH:mm:ss');

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("test");
} catch (err) {
    console.log(err);
}

app.post("/participants", async (req, res) => {
    const body = req.body;
    const validation = nameSchema.validate(body, {abortEarly: false});
    const user = {
        name: body.name,
        lastStatus: Date.now()
    }
    const message = {
        from: body.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: now
    }
    
    if(validation.error){
        const errors = validation.error.details.map(d => d.message);
        res.send(errors);
        return;
    }

    try {
        await db.collection("users").insertOne(user);
        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/participants", async (req, res) => {
    try {
        const participants = await db
            .collection("users")
            .find({})
            .toArray();
        res.send(participants);
        console.log(participants)
    } catch (err) {
        console.log(err);
        res.sendStatus(500)
    }  
});

app.post("/messages", async (req, res) => {
    const body = req.body;
    const validation = messageSchema.validate(body, {abortEarly: false});
    const message = {
        from: req.header.user,
        to: body.to,
        text: body.text,
        type: body.type,
        time: now
    }

    if(validation.error){ //validação do participante
        const errors = validation.error.details.map(d => d.message);
        res.send(errors);
        return;
    }

    try {
        const userOn = await db
            .collection("users")
            .findOne({name: req.header.user})

        console.log("User está na lista")
    
        if(!userOn){
            res.status(400).send("Este usuário não existe");
            return;
        }

        await db.collection("messages").insertOne(message);
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err);
    }
   
});


app.listen(5000, () => console.log("Server running in port: 5000"));