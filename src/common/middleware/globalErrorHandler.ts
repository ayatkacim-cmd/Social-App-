import type { NextFunction, Request, Response } from "express"
import { IError } from "../interface"



export default (err: IError, req: Request, res: Response, next: NextFunction): Response => {

    return res.status(err.status ?? 500).json({
        message: err.message,
        stack: err.stack,
        ...(err.cause? {cause : err.cause} :{})
    })

}