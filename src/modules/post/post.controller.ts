import { NextFunction, Request, Response, Router } from "express"
import { postService } from "./post.service"
import { IResponse, responseFormatter } from "../../common"
import * as pv from "./post.vaildation"
import { validator } from "../../common"
import auth from "../../common/middleware/auth"
import { fileTypes, multerLocal, processFiles } from "../../common/middleware/multer.local"
import { IFile } from "../../common/interface/multer.interface"
import { HPost } from "../../database/model/post.model"

export const postRouter = Router({
    strict: true,
    caseSensitive: true
})


postRouter.post("/", auth,
    multerLocal({
        fileType: fileTypes.images!,
        customPath: "posts"
    }).array("attachments", 5),
    processFiles({ fileType: fileTypes.images! }),
    validator(pv.createPostSchema),
    responseFormatter(
        async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HPost>> => {
            let data = await postService.create(req.user, req.validate.body, (req.files as IFile[]) ?? [])
            return {
                status: 201,
                data,
                message: "post created"
            }
        }
    )
)

// all posts of the logged-in user
postRouter.get("/", validator(pv.getMyPostsSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse> => {
        let data = await postService.getMyPosts(req.user, req.validate.query)
        return {
            status: 200,
            data,
            message: "posts fetched"
        }
    }
))

postRouter.get("/:postId", validator(pv.postIdSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HPost>> => {
        let data = await postService.getPost(req.user, req.validate.params.postId)
        return {
            status: 200,
            data,
            message: "post fetched"
        }
    }
))

postRouter.patch("/:postId", validator(pv.updatePostSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<HPost>> => {
        let data = await postService.update(req.user, req.validate.params.postId, req.validate.body)
        return {
            status: 200,
            data,
            message: "post updated"
        }
    }
))

postRouter.delete("/:postId", validator(pv.postIdSchema), auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        await postService.delete(req.user, req.validate.params.postId)
        return {
            status: 200,
            data: null,
            message: "post deleted"
        }
    }
))