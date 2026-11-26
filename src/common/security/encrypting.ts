import crypto from "node:crypto"
import { ENC_ALGO, IV_LENGTH, KEY } from "../../config/config.service"

let key = Buffer.from(KEY , "hex")



export const encrypting = (data:string) : string=>{
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher =  crypto.createCipheriv(ENC_ALGO, key, iv)
  let encrypted = cipher.update(data , "utf-8" ,"hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}::${encrypted}`
}

export const decrypting = (data:string) : string=>{
  let [iv , cipher] = data.split("::") as [string |Buffer<ArrayBuffer> , string]
  iv = Buffer.from(iv as string  , "hex")
  let plainText = crypto.createDecipheriv(ENC_ALGO ,key ,iv )
  let result = plainText.update(cipher , "hex" , "utf-8" )
  result += plainText.final("utf-8")
  return result
}