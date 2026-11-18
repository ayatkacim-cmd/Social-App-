import type { NextFunction, Request, RequestHandler, Response } from "express"
import { IResponse } from "../interface"

export const responseFormatter = (handler: Function): RequestHandler => {

    return async (req: Request, res: Response, next: NextFunction) => {
        let data: IResponse = await handler(req, res, next)
        if(res.headersSent) return
        return res.status(data.status || 200).json({
            message: data.message || "done",
            data: data.data || {}
        })

    }

}
