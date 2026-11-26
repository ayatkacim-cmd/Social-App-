import { ForbiddenException, NotFoundException } from "../../common/exceptions/application.exception"
import { commentRepo, CommentRepository } from "../../common/repository"
import { HUser } from "../../database/model/user.model"
import { HComment } from "../../database/model/comment.model"
import { isSameId, toObjectId } from "../../common/utils/objectId"
import { postService } from "../post/post.service"

class CommentService {

    private readonly commentRepo: CommentRepository
    private readonly postService: typeof postService

    constructor() {
        this.commentRepo = commentRepo
        this.postService = postService
    }

    private async findComment(commentId: string): Promise<HComment> {
        let comment = await this.commentRepo.findOne({ filter: { _id: toObjectId(commentId) } })
        if (!comment) throw new NotFoundException("comment not found")
        return comment
    }

    // commenting / reading comments needs access to the post (visibility + soft delete rules live in the post service)
    async create(user: HUser, postId: string, content: string) {
        let post = await this.postService.getVisiblePost(user, postId)
        return await this.commentRepo.create({
            data: {
                content,
                post: post._id,
                createdBy: toObjectId(user._id)
            }
        })
    }

    async getPostComments(user: HUser, postId: string, { page, limit }: { page: number, limit: number }) {
        let post = await this.postService.getVisiblePost(user, postId)
        return await this.commentRepo.pagination({
            filter: { post: post._id },
            options: { sort: { createdAt: -1 } },
            page,
            limit
        })
    }

    async getComment(user: HUser, commentId: string) {
        let comment = await this.findComment(commentId)
        await this.postService.getVisiblePost(user, String(comment.post))
        return comment
    }

    async update(user: HUser, commentId: string, content: string) {
        let comment = await this.findComment(commentId)
        await this.postService.getVisiblePost(user, String(comment.post))
        if (!isSameId(comment.createdBy, user._id)) throw new ForbiddenException("only the comment owner can update this comment")

        let updated = await this.commentRepo.findOneAndUpdate({ filter: { _id: comment._id }, update: { content } })
        if (!updated) throw new NotFoundException("comment not found")
        return updated
    }

    // the comment owner or the owner of the post can delete a comment
    async delete(user: HUser, commentId: string) {
        let comment = await this.findComment(commentId)
        let post = await this.postService.getVisiblePost(user, String(comment.post))
        let isCommentOwner = isSameId(comment.createdBy, user._id)
        if (!isCommentOwner && !this.postService.isOwner(user, post)) {
            throw new ForbiddenException("only the comment owner or the post owner can delete this comment")
        }
        await this.commentRepo.updateOne({ filter: { _id: comment._id }, update: { deletedAt: new Date() } })
    }

}

export const commentService = new CommentService()
