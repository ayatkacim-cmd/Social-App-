import {z} from "zod"
import { GF } from "../../common"
import { eventsEnum, languageEnum } from "../../common/enum"



let loginBody =(lang:languageEnum)=> z.strictObject({
    email: GF.email(lang),
    password: GF.password(lang)
})

export let loginSchema =(lang:languageEnum)=> z.object({
    body: loginBody(lang),
})

let signupBody = (lang:languageEnum)=> loginBody(lang).safeExtend({
    confirmPassword:GF.confirmPassword(lang),
    phone : GF.phone(lang),
    fullName: GF.fullName(lang),
    gender: GF.gender(lang),
    DOB:GF.DOB(lang)   
}).superRefine((data , ctx)=>{
    if(data.confirmPassword != data.password){
        ctx.addIssue({
            code:"custom",
            path:["confirmPassword"],
            message:"password not match confirm password"
        })
    }
})
export let signupSchema =(lang:languageEnum)=> z.object({
    body:signupBody(lang),
    //file:GF.file(lang)
})
export let rotateTokenSchema =(lang:languageEnum)=> z.object({
    headers:GF.headers(lang)

})

export let confirmEmailSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        email: GF.email(lang),
        otp: z.string().regex(/^\d{6}$/, { error: "otp must be 6 digits" })
    })
})

export let resendOtpSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        email: GF.email(lang),
        topic: z.enum([eventsEnum.signup, eventsEnum.forget])
    })
})

export let forgetPasswordSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        email: GF.email(lang)
    })
})

export let resetPasswordSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        email: GF.email(lang),
        otp: z.string().regex(/^\d{6}$/, { error: "otp must be 6 digits" }),
        newPassword: GF.password(lang),
        confirmPassword: GF.confirmPassword(lang)
    }).superRefine((data, ctx) => {
        if (data.confirmPassword != data.newPassword) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmPassword"],
                message: "password not match confirm password"
            })
        }
    })
})
