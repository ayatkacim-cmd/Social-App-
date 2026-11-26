import { Types } from "mongoose"
import crypto from "node:crypto"
import fs from "node:fs"
import { BadRequestException, ForbiddenException, NotFoundException } from "../../common/exceptions/application.exception"
import { postRepo, PostRepository, userRepo, UserRepository, followRepo, FollowRepository } from "../../common/repository"
import { s3Service, S3Service } from "../../common/services/s3.service"
import { AvailabilityEnum, followStatusEnum, privacyEnum, roleEnum } from "../../common/enum"
import { HUser } from "../../database/model/user.model"
import { HPost } from "../../database/model/post.model"
import { IFile } from "../../common/interface/multer.interface"
import { isSameId, toObjectId } from "../../common/utils/objectId"

class PostService {

    private readonly postRepo: PostRepository
    private readonly userRepo: UserRepository
    private readonly followRepo: FollowRepository
    private readonly s3Service: S3Service

    constructor() {
        this.postRepo = postRepo
        this.userRepo = userRepo
        this.followRepo = followRepo
        this.s3Service = s3Service
    }

    private async assertUsersExist(ids: string[]) {
        let unique = [...new Set(ids)]
        let count = await this.userRepo.countDocument({ filter: { _id: { $in: unique.map((id) => new Types.ObjectId(id)) } } })
        if (count !== unique.length) throw new BadRequestException("some tagged users don't exist")
        return unique.map((id) => new Types.ObjectId(id))
    }

    isOwner(user: HUser, post: HPost): boolean {
        return isSameId(user._id, post.createdBy)
    }



    private async canView(user: HUser, post: HPost): Promise<boolean> {
        if (this.isOwner(user, post) || user.role === roleEnum.admin) return true
        if (post.availability === AvailabilityEnum.ONLY_ME) return false

        let author = await this.userRepo.findOne({ filter: { _id: toObjectId(post.createdBy) } })
        if (!author) return false

        let follow = await this.followRepo.findOne({
            filter: { follower: toObjectId(user._id), following: author._id, status: followStatusEnum.accepted }
        })
        if (post.availability === AvailabilityEnum.FRIENDS) return !!follow
        return author.privacy === privacyEnum.public || !!follow
    }

    async getVisiblePost(user: HUser, postId: string): Promise<HPost> {
        let post = await this.postRepo.findOne({ filter: { _id: toObjectId(postId) } })
        if (!post || !(await this.canView(user, post))) throw new NotFoundException("post not found")
        return post
    }

    async create(
        user: HUser,
        data: { content?: string, availability?: AvailabilityEnum, tags?: string[] },
        files: IFile[] = []
    ) {
        if (!data.content && !files.length) throw new BadRequestException("post must have content or attachments")
        let me = toObjectId(user._id)
        let tags = data.tags?.length ? await this.assertUsersExist(data.tags) : []

        let folderId = crypto.randomUUID()
        let attachments: string[] = []
        if (files.length) {
            attachments = await this.s3Service.uploadAssets({
                folder: `users/${me}/posts/${folderId}`,
                files
            })
            files.forEach((file) => file.path && fs.unlink(file.path, () => { }))
        }

        return await this.postRepo.create({
            data: {
                ...(data.content ? { content: data.content } : {}),
                ...(data.availability !== undefined ? { availability: data.availability } : {}),
                tags,
                attachments,
                folderId,
                createdBy: me
            }
        })
    }

    async getMyPosts(user: HUser, { page, limit }: { page: number, limit: number }) {
        return await this.postRepo.pagination({
            filter: { createdBy: toObjectId(user._id) },
            options: { sort: { createdAt: -1 } },
            page,
            limit
        })
    }

    async getPost(user: HUser, postId: string) {
        return await this.getVisiblePost(user, postId)
    }

    async update(
        user: HUser,
        postId: string,
        data: { content?: string, availability?: AvailabilityEnum, tags?: string[] }
    ) {
        let post = await this.getVisiblePost(user, postId)
        if (!this.isOwner(user, post)) throw new ForbiddenException("only the post owner can update this post")

        // a post without attachments can't end up without content
        if (data.content === undefined && !post.content && !post.attachments?.length) {
            throw new BadRequestException("post must have content or attachments")
        }

        let update: Record<string, unknown> = {}
        if (data.content !== undefined) update.content = data.content
        if (data.availability !== undefined) update.availability = data.availability
        if (data.tags !== undefined) update.tags = data.tags.length ? await this.assertUsersExist(data.tags) : []

        let updated = await this.postRepo.findOneAndUpdate({ filter: { _id: post._id }, update })
        if (!updated) throw new NotFoundException("post not found")
        return updated
    }

    async delete(user: HUser, postId: string) {
        let post = await this.getVisiblePost(user, postId)
        if (!this.isOwner(user, post)) throw new ForbiddenException("only the post owner can delete this post")
        await this.postRepo.updateOne({ filter: { _id: post._id }, update: { deletedAt: new Date() } })
    }

}

export const postService = new PostService()