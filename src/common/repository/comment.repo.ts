import { commentModel } from "../../database/index.js"
import { IComment } from "../interface"
import { BaseRepository } from "./base.repository"

export class CommentRepository extends BaseRepository<IComment> {

    constructor() {
        super(commentModel)
    }

}

export const commentRepo = new CommentRepository()
