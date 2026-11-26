import { postModel } from "../../database/index.js"
import { IPost } from "../interface"
import { BaseRepository } from "./base.repository"

export class PostRepository extends BaseRepository<IPost> {

    constructor() {
        super(postModel)
    }

}

export const postRepo = new PostRepository()
