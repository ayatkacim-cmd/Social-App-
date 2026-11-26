import { followModel } from "../../database/index.js"
import { IFollow } from "../interface"
import { BaseRepository } from "./base.repository"

export class FollowRepository extends BaseRepository<IFollow> {

    constructor() {
        super(followModel)
    }

}

export const followRepo = new FollowRepository()
