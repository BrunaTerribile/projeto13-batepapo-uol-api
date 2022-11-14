import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import joi from 'joi'
import dayjs from 'dayjs';

let now = dayjs().locale('pt-br').format('HH:mm:ss');

const nameSchema = joi.object({
    name: joi.string()
})

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message').valid('private_message').required(),
})

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
        const isAvaiable = await db
            .collection("users")
            .findOne({name: body.name})

        if(isAvaiable){
            res.status(409).send("Nome de usuário indisponível");
            return;
        }

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
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }  
});

app.post("/messages", async (req, res) => {
    const body = req.body;
    const user = req.headers.user
    const validation = messageSchema.validate(body, {abortEarly: false});
    const message = {
        from: user,
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
            .findOne({name: user});
    
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

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    const user = req.headers.user
    
       try {
            const allMessages = await db
                .collection("messages")
                .find({})
                .toArray();

            const messages = await allMessages
                .filter( m => m.to === user || m.to === 'Todos');

            if(!limit){
                res.send(messages)
                return;
            }

            res.send(messages.slice(100));
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }   
});

app.post("/status", async (req, res) => {
    const user = req.headers.user
  
    try {
        const userOn = await db
        .collection("users")
        .findOne({name: user})
  
        console.log("User está na lista")
  
        if(!userOn){
            res.sendStatus(404);
            return;
        }
  
        await db
            .collection("users")
            .updateOne({name: user}, {$set: {lastStatus: Date.now()}});
  
        res.status(200).send("Time atualizado");
    } catch (err){
        res.status(500).send(err);
    }
});

async function remove(){
    const userList = await db
        .collection("users")
        .find({lastStatus: {$lte: (Date.now()-10000)}})
        .toArray();

    console.log(userList)

    userList.forEach(u => {
        db.collection("messages").insertOne({
            from: u.name, 
            to: 'Todos', 
            text: 'sai da sala...', 
            type: 'status', 
            time: now
        });
        db.collection("users").deleteOne({name: u.name});
    })
}

setInterval(remove, 15000)

app.listen(5000, () => console.log("Server running in port: 5000"));