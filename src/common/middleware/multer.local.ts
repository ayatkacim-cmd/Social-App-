import multer, { FileFilterCallback } from "multer"
import path from "node:path"
import fs from "node:fs"
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type"
import { IFile } from "../interface/multer.interface"
import { BadRequestException } from "../exceptions/application.exception"
import { Request, RequestHandler } from "express"

export const fileTypes:Record<string,string[]> = {
    images: ["image/png", "image/jpg", "image/jpeg", "image/webp"],
    pdf: ["application/pdf"],
    video: ["video/mp4",]
}

const buildFileFilter = (fileType: string[]) =>
    (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (!fileType.includes(file.mimetype)) {
            return cb(new BadRequestException("wrong file type"))
        }
        cb(null, true)
    }

export const multerLocal = ({ fileType, customPath } : {fileType:string[] , customPath?:string}) => {
    let storage = multer.diskStorage({
        destination: (req:Request, file : IFile, cb) => {
            let folderPath:string = path.resolve("./uploads")
            if(customPath){
                folderPath  = path.resolve(`./uploads/${customPath}`)
            }

            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath,{recursive:true})
            }
            cb(null, folderPath)
        },
        filename: (req:Request, file:IFile, cb) => {
            cb(null, Date.now() + "-" + file.originalname)
        }
    })

    let fileFilter = (req:Request, file:IFile, cb:FileFilterCallback) => {
        if (!fileType.includes(file.mimetype)) {
            cb(new BadRequestException("wrong file type"))
        }
        cb(null, true)
    }
    return multer({
        storage,
        fileFilter: buildFileFilter(fileType)
    }) 
}

export const multerMemory = ({ fileType }:{fileType:string[]}) => {
    let storage = multer.memoryStorage()
    let fileFilter = (req:Request, file:IFile, cb:FileFilterCallback) => {
        if (!fileType.includes(file.mimetype)) {
            cb(new BadRequestException("wrong file type"))
        }
        cb(null, true)
    }
    return multer({
        storage,
        fileFilter
    })
}


export const processFiles = ({ fileType }:{fileType:string[]}):RequestHandler=> {
    return async (req, res, next) => {
        if (req.file) {
            req.file = await processSingleFile(req.file, fileType)
        } else if (Array.isArray(req.files) && req.files.length > 0) {
            for (let file of req.files) {
                file = await processSingleFile(file, fileType)
            }
        }
    // } else if (typeof req.files == "object" && Object.keys(req.files).length > 0) {…
    // }
    next()
    }

}

const processSingleFile = async (file:IFile, fileType:string[]) => {
    let result
    if (file.buffer) {
        result = await fileTypeFromBuffer(file.buffer)
    } else {
        result = await fileTypeFromFile(file.path)
    }
    if (!result || !fileType.includes(result.mime)) {
        file.path && fs.unlinkSync(file.path)
        throw new BadRequestException("Invalid file type")
    }
    if (file.buffer) {
        let folderPath = "./uploads"
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath)
        }
        let fullPath = `./uploads/${Date.now()}.${result!.ext}`
        fs.writeFileSync(fullPath, file.buffer)
        file.fullPath = fullPath
    }
    return file
}