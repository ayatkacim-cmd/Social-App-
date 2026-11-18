import {config} from "dotenv"


//let envFilePath = process.env.NODE_ENV === "production"? ".env.production" :".env.development";
let envFilePath = `.env.${process.env.NODE_ENV}`;
config({path:envFilePath});



    export const port:number = Number(process.env.PORT)!
    export const DB_URI :string=process.env.DB_URI!
    export const REDIS_URI:string =process.env.REDIS_URI!
    export const ENC_ALGO :string=process.env.ENC_ALGO!
    export const KEY:string= process.env.KEY!
    export const IV_LENGTH:number= Number(process.env.IV_LENGTH)!
    export const USER_ACCESS_SECRET_KEY :string= process.env.USER_ACCESS_SECRET_KEY!
    export const USER_REFRESH_SECRET_KEY :string= process.env.USER_REFRESH_SECRET_KEY!
    export const ADMIN_ACCESS_SECRET_KEY :string= process.env.ADMIN_ACCESS_SECRET_KEY!
    export const ADMIN_REFRESH_SECRET_KEY:string = process.env.ADMIN_REFRESH_SECRET_KEY!
    export const HASH_SALT:number= Number(process.env.HASH_SALT)!
    export const ACCESS_EX :number= Number(process.env.ACCESS_EX)!
    export const REFRESH_EX:number=Number(process.env.REFRESH_EX)!
    export const APP_PASSWORD:string= process.env.APP_PASSWORD!
    export const APP_EMAIL:string= process.env.APP_EMAIL!
    export const MAX_SEND_RETRIES:string= process.env.MAX_SEND_RETRIES!
    export const MAX_OTP_RETRIES:string= process.env.MAX_OTP_RETRIES!
    
