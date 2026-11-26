import { NextFunction, Request, Response, Router } from "express"
import { authorization, IResponse, responseFormatter } from "../../common"
import {validator} from "../../common"
import { ILoginResponse } from "./dto/loginResponseType"
import { IUser } from "../../common/interface"
import { HUser } from "../../database/model/user.model"
import { BadRequestException } from "../../common/exceptions/application.exception"
import auth from "../../common/middleware/auth"
import { followStatusEnum, roleEnum } from "../../common/enum"
import { getUserSchema, paginationSchema, privacySchema, searchUsersSchema, softDeleteSchema, suggestionsSchema, updateProfileSchema } from "./user.vaildation"
import { userService } from "./user.service"
import { fileTypes, multerLocal, processFiles } from "../../common/middleware/multer.local"
import { IFile } from "../../common/interface/multer.interface"

export const userRouter = Router({
    strict: true,
    caseSensitive: true
})


userRouter.delete("/soft-delete",validator(softDeleteSchema),auth,authorization([roleEnum.admin]),
    responseFormatter(async(req: Request, res: Response) => {
        let user = await userService.softDelete(req.body.userId)
        return {
            status: 200,
            message: "user soft deleted",
            data: user
        }
    })
)

userRouter.delete("/hard-delete",validator(softDeleteSchema),auth,authorization([roleEnum.admin]),
    responseFormatter(async(req: Request, res: Response) => {
        let user = await userService.hardDelete(req.body.userId)
        return {
            status: 200,
            message: "user hard deleted",
            data: user
        }
    })
)

userRouter.get("/get-user/:userId",validator(getUserSchema),auth,authorization([roleEnum.admin]),responseFormatter(async (req: Request, res: Response) => {

    console.log(req.validate, "validate")
    let { user, data } = await userService.getUser(
        req.validate.params.userId
    )
    return {
        status: 200,
        message: "user fetched",
        data: {
            user,
            data
        }
    }

}))

userRouter.patch("/restore", validator(softDeleteSchema), auth, authorization([roleEnum.admin]), responseFormatter(async (req: Request, res: Response) => {
    let user = await userService.restore(req.body.userId)
    return {
        status: 200,
        message: "user restored",
        data: user
    }
}))

userRouter.patch("/update", validator(softDeleteSchema), auth, authorization([roleEnum.admin]), responseFormatter(async (req: Request, res: Response) => {
    let user = await userService.update(req.user, req.body)
    return {
        status: 200,
        message: "user restored",
        data: user
    }
}))


userRouter.put("/admin-update/:userId", auth, authorization([roleEnum.admin]), responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
    let user = await userService.adminUpdate(req.params.userId as string, req.body)
    return {
        status: 200,
        message: "user restored",
        data: user
    }
}))

userRouter.patch("/image",auth,responseFormatter(async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {

    let key: string = await userService.updateImage(
        req.user,
        req.body
    )

    return {
        status: 200,
        message: "url created",
        data: {
            key
        }
    }
    })
)

userRouter.patch("/cover-images",auth,multerLocal({
        fileType: fileTypes.images!,
        customPath: "profile"
    }).array("images"),
    processFiles({ fileType: fileTypes.images! }),
    responseFormatter(async (req: Request, res: Response, next: NextFunction) => {
        console.log(req.files, "files")
        let keys: string[] = await userService.updateCoverImages(
            req.user,
            req.files as IFile[]
        )

        return {
            status: 200,
            message: "image uploaded",
            data: {
                keys
            }
        }
    })
)


// ------------------------------------------------------------------ profile

userRouter.get("/profile", auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getMyProfile(req.user)
    return {
        status: 200,
        message: "profile fetched",
        data
    }
}))

userRouter.patch("/profile", validator(updateProfileSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.updateProfile(req.user, req.validate.body)
    return {
        status: 200,
        message: "profile updated",
        data
    }
}))

userRouter.get("/profile/:userId", validator(getUserSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getProfile(req.user, req.validate.params.userId)
    return {
        status: 200,
        message: "profile fetched",
        data
    }
}))

// ------------------------------------------------------------------ settings

userRouter.patch("/settings/privacy", validator(privacySchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.setPrivacy(req.user, req.validate.body.privacy)
    return {
        status: 200,
        message: "privacy updated",
        data
    }
}))

// ------------------------------------------------------------------ follow / unfollow

userRouter.post("/follow/:userId", validator(getUserSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.follow(req.user, req.validate.params.userId)
    return {
        status: 201,
        message: data.status === followStatusEnum.pending ? "follow request sent" : "user followed",
        data
    }
}))

userRouter.delete("/follow/:userId", validator(getUserSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    await userService.unfollow(req.user, req.validate.params.userId)
    return {
        status: 200,
        message: "user unfollowed",
        data: null
    }
}))

userRouter.get("/followers", validator(paginationSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getFollowers(req.user, req.validate.query)
    return {
        status: 200,
        message: "followers fetched",
        data
    }
}))

userRouter.get("/following", validator(paginationSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getFollowing(req.user, req.validate.query)
    return {
        status: 200,
        message: "following fetched",
        data
    }
}))

userRouter.get("/follow-requests", validator(paginationSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getFollowRequests(req.user, req.validate.query)
    return {
        status: 200,
        message: "follow requests fetched",
        data
    }
}))

userRouter.patch("/follow-requests/:userId/accept", validator(getUserSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.acceptFollowRequest(req.user, req.validate.params.userId)
    return {
        status: 200,
        message: "follow request accepted",
        data
    }
}))

userRouter.delete("/follow-requests/:userId", validator(getUserSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    await userService.rejectFollowRequest(req.user, req.validate.params.userId)
    return {
        status: 200,
        message: "follow request rejected",
        data: null
    }
}))

// ------------------------------------------------------------------ search & suggestions

userRouter.get("/search", validator(searchUsersSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.search(req.user, req.validate.query)
    return {
        status: 200,
        message: "users fetched",
        data
    }
}))

userRouter.get("/suggestions", validator(suggestionsSchema), auth, responseFormatter(async (req: Request, res: Response) => {
    let data = await userService.getSuggestions(req.user, req.validate.query.limit)
    return {
        status: 200,
        message: "suggestions fetched",
        data
    }
}))
