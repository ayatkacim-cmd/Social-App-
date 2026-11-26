import { EventEmitter } from "node:events";
import { sendMail } from "../services/mail.service"
import { emailTemplate } from "../templates/templates";
import { eventsEnum } from "../enum/events.enum.js";


export let eventEmitter = new EventEmitter()

eventEmitter.on(eventsEnum.signup , async ({recipients , otp})=>{
    try{
        await sendMail({
            recipients,
            subject: "Welcome to Saraha app",
            html: emailTemplate({
            title:"Email Verification",
            message :`your OTP is`,
            otp,
            expiresIn :"5 minutes"
        })
        })
    }catch(e:any){
        console.log(e.message)
        console.log(e)
    }
})

eventEmitter.on(eventsEnum.forget , async ({recipients , otp})=>{
    try{
        await sendMail({
            recipients,
            subject: "Forget Password Otp",
            html: emailTemplate({
            title:"Email Verification",
            message :`your OTP to reset your password is:`,
            otp,
            expiresIn :"5 minutes"
        })
        })
    }catch(e:any){
        console.log(e.message)
        console.log(e)
    }
})