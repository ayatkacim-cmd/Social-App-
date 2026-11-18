import { NextFunction, Request, Response } from "express"
import { languageEnum } from "../enum"
import { ZodType } from "zod"
import { BadRequestException } from "../exceptions/application.exception"

type validationSchema = (lang: languageEnum) => ZodType

export const validator = (schema: validationSchema) => {

    return (req: Request, res: Response, next: NextFunction) => {
    let lang = Number(req.headers["lang"]) || languageEnum.en
    let { success, error, data } = schema(lang).safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers
    })

    if (!success) {
      // return res.status(400).json({
      //   message: "validation error",
      //   issues: error?.issues
      // })

        throw new BadRequestException("validation error", error?.issues)
    }
    req.validate = data

    return next()

    }

}