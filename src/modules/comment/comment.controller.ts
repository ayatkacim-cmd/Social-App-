import { NextFunction, Request, Response, Router } from "express"
import { commentService } from "./comment.service"
import { IResponse, responseFormatter } from "../../common"
import * as cv from "./comment.vaildation"
import { validator } from "../../common"
import auth from "../../common/middleware/auth"
import { HComment } from "../../database/model/comment.model"

export const commentRouter = Router({
    strict: true,
    caseSensitive: true
})

commentRouter.post("/post/:postId", validator(cv.createCommentSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HComment>> => {
        let data = await commentService.create(req.user, req.validate.params.postId, req.validate.body.content)
        return {
            status: 201,
            data,
            message: "comment created"
        }
    }
))

commentRouter.get("/post/:postId", validator(cv.getPostCommentsSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
        let data = await commentService.getPostComments(req.user, req.validate.params.postId, req.validate.query)
        return {
            status: 200,
            data,
            message: "comments fetched"
        }
    }
))

commentRouter.get("/:commentId", validator(cv.commentIdSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HComment>> => {
        let data = await commentService.getComment(req.user, req.validate.params.commentId)
        return {
            status: 200,
            data,
            message: "comment fetched"
        }
    }
))

commentRouter.patch("/:commentId", validator(cv.updateCommentSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HComment>> => {
        let data = await commentService.update(req.user, req.validate.params.commentId, req.validate.body.content)
        return {
            status: 200,
            data,
            message: "comment updated"
        }
    }
))

commentRouter.delete("/:commentId", validator(cv.commentIdSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        await commentService.delete(req.user, req.validate.params.commentId)
        return {
            status: 200,
            data: null,
            message: "comment deleted"
        }
    }
))
