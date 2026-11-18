import mongoose from "mongoose";
import {DB_URI}  from "../config/config.service"
//import {redisConnection} from "./redis.connection.js"

export default async ()=>{
    try {
        await mongoose.connect(DB_URI)
        console.log("DB connected")
        //await redisConnection()
    } catch (error) {
        console.log(error)
    }


}