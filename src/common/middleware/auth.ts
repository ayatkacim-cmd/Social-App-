import type { NextFunction, Request, Response } from "express"
import { BadRequestException, NotFoundException, UnAuthorizedException } from "../exceptions/application.exception"
import { authEnum, tokenTypesEnum } from "../enum"
import { userRepo } from "../repository"
import { myCompare } from "../security"
import { tokenService } from "../services"

export default async (req: Request, res: Response, next: NextFunction) => {

    let authorization = req.headers.authorization
    if (!authorization) throw new UnAuthorizedException("auth users only")

    let [prefix, token] = authorization.split(" ") as [string, string]

    switch (prefix) {
        case authEnum.Basic:
            let data = Buffer.from(token, "base64").toString()
            let [email, password] = data.split(":")
            let user = await userRepo.findOne({ filter: { email: email as string } })
            if (!user) throw new NotFoundException("user not found")
            let check = myCompare({ plainText: password as string, hashedText: user.password })
            if (!check) throw new NotFoundException("user not found")
            req.user = user
            next()
            break

        case authEnum.Bearer:
            req.user = await tokenService.verifyToken(token, tokenTypesEnum.access)
            next()
            break

        default:
            throw new BadRequestException("invalid auth type")
    }
}