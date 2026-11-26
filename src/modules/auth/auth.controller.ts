import { NextFunction, Request, Response, Router } from "express"
import { authService as as } from "./auth.service"
import { IResponse, responseFormatter } from "../../common"
import * as av from "./auth.vaildation"
import {validator} from "../../common"
import { ILoginResponse } from "./dto/loginResponseType"
import { IUser } from "../../common/interface"
import { HUser } from "../../database/model/user.model"
import { BadRequestException } from "../../common/exceptions/application.exception"
import auth from "../../common/middleware/auth"

export const authRouter = Router({
    strict: true,
    caseSensitive: true
})

authRouter.post("/signup",validator(av.signupSchema), responseFormatter(
    async (req: Request,res: Response, next: NextFunction): Promise<IResponse<IUser>> => {
    let data = await as.createUser(req.body , null)
    return {
        status: 201,
        data,
        message: "user created"
    }
    }
))

authRouter.post("/confirmEmail",validator(av.confirmEmailSchema),responseFormatter(
    async (req: Request,res: Response, next: NextFunction): Promise<IResponse<HUser | void>> => {
    let user = await as.confirmEmail(req.body)

    return {
        status: 201,
        data:user,
        message: "user confirmed"
    }

}))

authRouter.post("/login", validator(av.loginSchema), responseFormatter(

    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<ILoginResponse>> => {
        let issuer: string = `${req.protocol}://${req.host}`
        let tokens = await as.login(req.body, issuer)
        return {
            status: 200,
            data: tokens,
            message: "user logged in"
        }
    }

))


authRouter.post(["/loginWithGmail","/gmail"], responseFormatter(

    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<ILoginResponse>> => {
        let issuer:string = `${req.protocol}://${req.host}`
        let { tokens, status } = await as.loginWithGmail(req.body, issuer)
        return {
            status,
            data: tokens,
            message: "user loggedIn"
        }
    }

))


authRouter.get("/rotate-token", responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<ILoginResponse>> => {
        let issuer: string = `${req.protocol}://${req.host}`
        if (!req.headers.authorization)throw new BadRequestException("token not found")
        let tokens: ILoginResponse = await as.rotateToken(
            req.headers.authorization,
            issuer
        )
        return {
            status: 200,
            data: tokens,
            message: "tokens rotated"
        }
    }
))


authRouter.post("/logout", auth, responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        if (!req.headers.authorization)throw new BadRequestException("token not found")
        await as.logout(
            req.headers.authorization,
            req.body?.type
        )
        return {
            status: 200,
            data: null,
            message: "user loggedOut"
        }
    }
))

authRouter.post("/resend-otp", validator(av.resendOtpSchema), responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        await as.resendOtp(req.validate.body)
        return {
            status: 200,
            data: null,
            message: "if the email is registered, a new otp was sent"
        }
    }
))

authRouter.post("/forget-password", validator(av.forgetPasswordSchema), responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        await as.forgetPassword(req.validate.body)
        return {
            status: 200,
            data: null,
            message: "if the email is registered, an otp was sent"
        }
    }
))

authRouter.patch("/reset-password", validator(av.resetPasswordSchema), responseFormatter(
    async (req: Request, res: Response, next: NextFunction): Promise<IResponse<null>> => {
        await as.resetPassword(req.validate.body)
        return {
            status: 200,
            data: null,
            message: "password changed, please login again"
        }
    }
))
