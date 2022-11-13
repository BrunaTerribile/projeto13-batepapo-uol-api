import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from "dotenv";
import joi from 'joi'



const nameSchema = joi.object({
    name: joi.string()
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
    const body = req.body
    const validation = nameSchema.validate(body, {abortEarly: false});
    const user = {
        name: body.name,
        lastStatus: Date.now()
    }
    
    if(validation.error){
        const errors = validation.error.details.map(d => d.message);
        res.send(errors);
        return;
    }

    try {
        await db.collection("users").insertOne(user)
        console.log(user)
        res.status(201).send("Usuário salvo com sucesso")
    } catch (err) {
        res.status(500).send(err)
    }
});


app.listen(5000, () => console.log("Server running in port: 5000"));