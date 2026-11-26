import type { NextFunction, Request, Response } from "express"
import { roleEnum } from "../enum/role.enum.js"
import { UnAuthorizedException } from "../exceptions/application.exception.js"

export default (roles: roleEnum[]) => {

    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role))throw new UnAuthorizedException("Not allowed")
        next()

    }

}