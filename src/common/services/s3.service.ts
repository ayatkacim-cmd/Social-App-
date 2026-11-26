import { DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_PRE_SIGNED_EXP, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../../config/config.service"
import { IFile } from "../interface/multer.interface"
import { enums } from ".."
import { readFileSync } from "node:fs"
import { storageEnum } from "../enum"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export class S3Service{
    private readonly client:S3Client

    constructor(){
        this.client = new S3Client({
            region:AWS_REGION,
            credentials:{
                accessKeyId : AWS_ACCESS_KEY_ID,
                secretAccessKey:AWS_SECRET_ACCESS_KEY
            }
        })
    }

    async uploadImage({
        key,
        file,
        storage = enums.storageEnum.disk
    }:{
        key:string,
        file:IFile,
        storage?:enums.storageEnum
    }){
        let data = this.client.send(new PutObjectCommand({
            Bucket:AWS_BUCKET_NAME,
            Key:`${key}/${file.originalname}`,
            Body : storage == enums.storageEnum.disk ? readFileSync(file.fullPath || file.path ) : file.buffer,
            ACL : "private"
        }))

    return data
    }

    async uploadAssets({
        folder,
        storage = storageEnum.disk,
        files
    }: {
        folder: string,
        storage?: storageEnum,
        files: IFile[]
    }) {

    let promises = files.map(
        (file) => this.uploadAsset({ folder, file, storage })
    )
    return await Promise.all(promises)
    }

    async uploadAsset({
            folder,
            file,
            storage = storageEnum.disk
        }: {
            folder: string,
            file: IFile,
            storage?: storageEnum
        }) {
    
            let key = `${folder}/${file.originalname}`
    
            await this.client.send(new PutObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: key,
                Body:
                    storage == storageEnum.disk? readFileSync(file.fullPath || file.path): file.buffer,
            })
            
        )
    return key
    }
    
    
    async getAsset({
        key
    }: {
        key: string
    }): Promise<GetObjectCommandOutput> {
        let command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key
        })
        let data = await this.client.send(command)
        return data
    }

    async deleteAsset({key}: {key: string}): Promise<DeleteObjectCommandOutput> {
        let command = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key
        })
        let data = await this.client.send(command)
        return data
    }

    async deleteAssets({keys}: {keys: string[]}): Promise<DeleteObjectsCommandOutput> {

        let command = new DeleteObjectsCommand({
            Bucket: AWS_BUCKET_NAME,
            Delete: {
                Objects: keys.map(
                    (Key: string) => ({ Key })
                )
            }
        })
        let data = await this.client.send(command)
        return data
    }

    async listObject({key}: {key: string}): Promise<ListObjectsV2CommandOutput> {
        let command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET_NAME,
            Prefix: key
        })
        let data = await this.client.send(command)
        return data
    }

    async deleteFolder({key}: {key: string}): Promise<boolean> {

        let data = await this.listObject({ key })
        let keys = data.Contents?.map(
            (cont) => cont.Key
        )
        if (keys && keys.length)await this.deleteAssets({keys: keys as string[]})
        return true
    }
    // async uploadLargeImage({
    //     file,
    //     storage = enums.storageEnum.disk,
    //     folder
    // }:{
    //     file:IFile,
    //     storage?:enums.storageEnum,
    //     folder:string
    // }){
    //     let data = new Upload({
    //         client : this.client,
    //         params:{
    //             Bucket: AWS_BUCKET_NAME,
    //             Key:`${folder}/${file.originalname}`,
    //             Body : storage == enums.storageEnum.disk ? readFileSync(file.fullPath || file.path ) : file.buffer,
    //             ContentType: file.mimetype
    //         }
    //     })
    //     // data.on("httpUploadProgresss",(progress)=>{
    //     //     console.log(progress)
    //     // })
    //     return await data.done()
    // }



    async createPreSignedUrl({Key}: {Key: string,}): Promise<string> {

        let command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key,
        })
        return await getSignedUrl(
            this.client,
            command,
            {
                expiresIn: AWS_PRE_SIGNED_EXP
            }
        )
    }
}
export const s3Service = new S3Service()