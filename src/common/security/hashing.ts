import bcrypt from "bcrypt"
import { HASH_SALT } from "../../config/config.service"

export const myHash = async (plainText:string):Promise<string> => {
  return await bcrypt.hash(plainText, HASH_SALT)
}

export const myCompare = async ({ plainText, hashedText }:{plainText:string , hashedText:string}) : Promise<boolean> => {
  return await bcrypt.compare(plainText, hashedText)
}