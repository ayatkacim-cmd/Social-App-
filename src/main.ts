import express from "express";
import type { NextFunction, Request, Response } from "express"
import { authRouter, userRouter , postRouter , commentRouter } from "./modules";
import { globalErrorHandler } from "./common/middleware";
import { dbConnect } from "./database";
import { cacheService, notificationService } from "./common/services";
import cors from "cors"
import { s3Service } from "./common/services/s3.service";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

let s3Get = promisify(pipeline)

const app: express.Application = express()

app.use(cors(),express.json())

dbConnect().then(async () => {

  await cacheService.set({
    key: "name",
    value: "ayat"
  })

  app.listen(3000, () => {
    console.log(`server connected on port 3000`)
  })
})

app.get("/uploads/*path",async (req: Request,res: Response,next: NextFunction) => {

    let { download, filename } = req.query
    let key = (req.params.path as string[]).join("/")
    console.log(key)
    if (!filename)filename = (req.params.path as string[]).pop()
    let { Body } = await s3Service.getAsset({
      key
    })
    // res.setHeader(
    //   "Content-Type",
    //   ContentType || "application/octet-stream"
    // )
    if (download == "true")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      )
    res.set("Cross-Origin-Resource-Policy","cross-origin")
    s3Get(Body as ReadableStream, res)
})

app.use("/auth", authRouter)
app.use("/user", userRouter)
app.use("/post", postRouter)
app.use("/comment", commentRouter)
app.get("/", async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  // notificationService.sendNotification({
  // token: req.body.token,
  // title: "test",
  // body: "first notification sending"
  // })
  return res.status(200).json({
    message: "server is healthy"
  })
})
app.use(globalErrorHandler)






