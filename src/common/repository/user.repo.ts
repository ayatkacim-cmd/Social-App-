import { userModel } from "../../database/index.js"
import { IUser } from "../interface/user.interface.js"
import { BaseRepository } from "./base.repository"

export class UserRepository extends BaseRepository<IUser> {

    constructor() {
        super(userModel)
    }

}

export const userRepo = new UserRepository()
// export const findUser = async({ where={} , check = false , select})=>{
//     return await base.findOne({model , where , check , select})

// }
// export const findUsers = async({ where={} ,  limit , skip , sort , select , page})=>{
//     return await base.find({model, limit , skip , sort , select , page})
// }
// export const createUser = async({ data})=>{
//     return await base.create({model ,data})
// }
// export const updateOneUser = async({ data , where})=>{
//     return await base.updateOne({model, where ,data})
// }