import { z } from "zod";
import {enums} from "../index.js"
import {getErrorMessage} from "./vaildationErrors"
import { isValidObjectId } from "mongoose";
import { languageEnum } from "../enum/language.enum.js";

export default{
    phone:(lang : languageEnum)=> z.e164({pattern:/01[0-25]\d{8}$/, error:getErrorMessage("wrongPhone",lang)}),
    email:(lang : languageEnum)=> z.email({
        error:getErrorMessage("invalidEmail",lang)
    }),
    password: (lang: languageEnum) =>
    z.string().max(20, { error: lang === languageEnum.ar ? "كلمة السر طويلة للغاية" : "password is too long" })
        .min(5,  { error: lang === languageEnum.ar ? "كلمة السر قصيرة للغاية" : "password is too short" }),
    confirmPassword: (lang : languageEnum)=> z.string().max(20).min(5),
    fullName: (lang : languageEnum)=> z.string().regex(/^[A-Za-z]{3,20}\s[A-Za-z]{3,20}$/ , {error :getErrorMessage("fullName", lang)}),
    gender: (lang: languageEnum) =>
    z.enum(enums.genderEnum, {
        error: lang === languageEnum.ar
            ? "النوع لازم يكون ذكر أو أنثى"
            : "gender must be male or female",
    }),
    DOB: (lang : languageEnum)=> z.string(),
    page : (lang : languageEnum)=> z.coerce.number().gte(1),
    limit : (lang : languageEnum)=> z.coerce.number().gte(1),
    userId : (lang : languageEnum) => z.string().min(24).max(24).refine((value) => isValidObjectId(value),{error: "This is't valid objectId"})
,
    headers:(lang : languageEnum)=> z.object({
        authorization :(lang : languageEnum)=> z.string().jwt({alg:"HS256"}),
        "accecpt-lan" : (lang : languageEnum)=> z.enum(["ar", "en"])
    }),
    stringBool :(lang : languageEnum)=> z.stringbool({
            truthy:["true"],
            falsy:["false"],
            case:"sensitive",
            error:"this value must be true or false"
    }),
    file: (lang : languageEnum) => z.strictObject({
        fieldname:  z.string(),
        originalname:  z.string(),
        encoding:  z.string(),
        mimetype:  z.string(),
        size:  z.number(),
        destination: z.string().optional(),
        filename:  z.string().optional(),
        path: z.string().optional(),
        buffer: z.string().optional()
    })
}