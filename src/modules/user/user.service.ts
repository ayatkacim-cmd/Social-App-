
import { Types } from "mongoose"
import { BadRequestException, ConflictException, NotFoundException } from "../../common/exceptions/application.exception"
import { userRepo, UserRepository, followRepo, FollowRepository } from "../../common/repository"
import { CacheService, cacheService, tokenService, TokenService } from "../../common/services"
import { HUser } from "../../database/model/user.model"
import { s3Service, S3Service } from "../../common/services/s3.service"
import { IFile } from "../../common/interface/multer.interface"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { readFileSync } from "node:fs"
import { followStatusEnum, privacyEnum, roleEnum, storageEnum } from "../../common/enum"
import { isSameId, toObjectId } from "../../common/utils/objectId"
import type { IUser } from "../../common/interface"
import type { QueryFilter } from "mongoose"
import { AWS_BUCKET_NAME } from "../../config/config.service"



type GPayload = {email: string,given_name: string,family_name: string,picture: string}

// never send password / changedAt / provider internals to the client
const MY_FIELDS = "-password -changedAt -__v"
// what anybody is allowed to see on a public profile
const PUBLIC_FIELDS = "firstName lastName image covers gender privacy createdAt"
// what is shown in lists (search, suggestions, followers...) and on a private profile the viewer can't open
const LIST_FIELDS = "firstName lastName image privacy"
const notDeleted = { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] } as QueryFilter<IUser>
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

class UserService {

    private readonly userRepo: UserRepository
    private readonly cacheService: CacheService
    private readonly s3Service :S3Service
    private readonly followRepo: FollowRepository


    constructor() {
        this.userRepo = userRepo
        this.cacheService = cacheService
        this.s3Service = s3Service
        this.followRepo = followRepo
    }
    
    async softDelete(userId: string) {
        let user = this.userRepo.findByIdAndUpdate({
            id: new Types.ObjectId(userId),
            update: {
                deletedAt: new Date()
            }
        })

        if (!user) throw new NotFoundException("user not found")
        return user
    }

    async hardDelete(userId: string) {
        let user = await this.userRepo.findOneAndDelete({
            filter: { _id: new Types.ObjectId(userId) }
        })
        if (!user) throw new NotFoundException("user not found")
        return user
    }

    async restore(userId: string) {
        let user = await this.userRepo.findOneAndUpdate({
            filter: { _id: new Types.ObjectId(userId), deletedAt: { $exists: true, $ne: null }, paranoid: false },
            update: {
                deletedAt: null
            }
        })
        if (!user) throw new NotFoundException("user not found")
        return user
    }

    async getUser(userId: string) {
        let user = await this.userRepo.findOne({
            filter: {_id: new Types.ObjectId(userId),paranoid: false}
        })
        if (!user) throw new NotFoundException("user not found")
        let data = await this.s3Service.deleteFolder({
            key: `users/${user.id}`
        })
        return {user,data}
    }
    



    async updateImage(user: HUser, data: any): Promise<string> {
    let Key = `users/${user.id}/profile/${data.filename}`
    let url = await this.s3Service.createPreSignedUrl({
        Key: `users/${user.id}/profile/${data.filename}`
    })

    let oldImage = user.image
    let updateData = await this.userRepo.updateOne({
        filter: {_id: user.id},
        update: {image: Key}
    })
    if (!updateData.modifiedCount) throw new BadRequestException()
    if (oldImage) {
        let deleteData = await this.s3Service.deleteAsset({ key: oldImage })
        console.log({ deleteData }, " deleted data output")
    }
    return url
    }


    async updateCoverImages(
        user: HUser,
        files: IFile[]
    ) {
        let keys = await this.s3Service.uploadAssets({
            folder: `users/${user.id}/profile`,
            files
        })
        let oldCovers:string[]= user.covers ?? []
        let data = await this.userRepo.updateOne({
            filter: {_id: user.id},
            update: {covers: keys}
        })
        if (!data.modifiedCount) {
            throw new BadRequestException()
        }
        if (oldCovers.length) {
            this.s3Service.deleteAssets({keys: oldCovers})
        }
        return keys
    }

    async update(user: HUser, data: { firstName?: string, lastName?: string }) {
        let updateData = this.userRepo.updateOne({
            filter: { _id: user._id },
            update: data
        })
        return updateData
    }

    async adminUpdate(userId: string, data: { firstName?: string, lastName?: string }) {
        let updateData = await this.userRepo.updateOne({
            filter: { _id: userId },
            update: data
        })
        return updateData
    }


    // the user is cached in redis for a short time by the token service, so changes must clear it
    private async clearUserCache(userId: string) {
        await this.cacheService.del({ keys: [`user::${userId}`] })
    }

    private async getUsersMap(ids: Types.ObjectId[]) {
        let users = await this.userRepo.find({
            filter: { _id: { $in: ids }, $and: [notDeleted] },
            projection: LIST_FIELDS
        })
        return new Map(users.map((u) => [u.id as string, u]))
    }

    private async getCounts(userId: Types.ObjectId) {
        let [followersCount, followingCount] = await Promise.all([
            this.followRepo.countDocument({ filter: { following: userId, status: followStatusEnum.accepted } }),
            this.followRepo.countDocument({ filter: { follower: userId, status: followStatusEnum.accepted } })
        ])
        return { followersCount, followingCount }
    }

    // ---------------------------------------------------------------- profile

    async getMyProfile(user: HUser) {
        let me = toObjectId(user._id)
        let profile = await this.userRepo.findOne({ filter: { _id: me }, projection: MY_FIELDS })
        if (!profile) throw new NotFoundException("user not found")
        return { ...profile.toJSON(), ...(await this.getCounts(me)) }
    }

    async updateProfile(user: HUser, data: Partial<Pick<IUser, "firstName" | "lastName" | "phone" | "gender" | "DOB">>) {
        let me = toObjectId(user._id)
        let result = await this.userRepo.updateOne({ filter: { _id: me }, update: data })
        if (!result.matchedCount) throw new NotFoundException("user not found")
        await this.clearUserCache(me.toString())
        return await this.getMyProfile(user)
    }

    async getProfile(user: HUser, userId: string) {
        let me = toObjectId(user._id)
        let target = toObjectId(userId)
        if (isSameId(me, target)) return { ...(await this.getMyProfile(user)), relation: "me" }

        let profile = await this.userRepo.findOne({ filter: { _id: target }, projection: PUBLIC_FIELDS })
        if (!profile) throw new NotFoundException("user not found")

        let follow = await this.followRepo.findOne({ filter: { follower: me, following: target } })
        let relation = follow ? (follow.status === followStatusEnum.accepted ? "following" : "requested") : "none"
        let counts = await this.getCounts(target)

        let canSee = profile.privacy === privacyEnum.public || relation === "following" || user.role === roleEnum.admin
        if (!canSee) {
            // private profile: only the basics are visible until the follow request is accepted
            let { firstName, lastName, image, privacy } = profile
            return { id: profile.id, firstName, lastName, fullName: profile.get("fullName"), image, privacy, ...counts, relation, restricted: true }
        }
        return { ...profile.toJSON(), ...counts, relation, restricted: false }
    }

    async setPrivacy(user: HUser, privacy: privacyEnum) {
        let me = toObjectId(user._id)
        await this.userRepo.updateOne({ filter: { _id: me }, update: { privacy } })
        if (privacy === privacyEnum.public) {
            // nothing to approve anymore on a public profile
            await this.followRepo.updateMany({
                filter: { following: me, status: followStatusEnum.pending },
                update: { status: followStatusEnum.accepted }
            })
        }
        await this.clearUserCache(me.toString())
        return { privacy }
    }

    // ---------------------------------------------------------------- follow

    async follow(user: HUser, userId: string) {
        let me = toObjectId(user._id)
        let target = toObjectId(userId)
        if (isSameId(me, target)) throw new BadRequestException("you can't follow yourself")

        let targetUser = await this.userRepo.findOne({ filter: { _id: target } })
        if (!targetUser) throw new NotFoundException("user not found")

        let exists = await this.followRepo.findOne({ filter: { follower: me, following: target } })
        if (exists) {
            throw new ConflictException(exists.status === followStatusEnum.pending ? "follow request already sent" : "you already follow this user")
        }

        // private account => the owner has to accept first
        let status = targetUser.privacy === privacyEnum.private ? followStatusEnum.pending : followStatusEnum.accepted
        try {
            await this.followRepo.create({ data: { follower: me, following: target, status } })
        } catch (e: any) {
            if (e?.code === 11000) throw new ConflictException("you already follow this user")
            throw e
        }
        return { status }
    }

    // also cancels a pending follow request
    async unfollow(user: HUser, userId: string) {
        let deleted = await this.followRepo.findOneAndDelete({
            filter: { follower: toObjectId(user._id), following: toObjectId(userId) }
        })
        if (!deleted) throw new NotFoundException("you don't follow this user")
    }

    async acceptFollowRequest(user: HUser, userId: string) {
        let follow = await this.followRepo.findOneAndUpdate({
            filter: { follower: toObjectId(userId), following: toObjectId(user._id), status: followStatusEnum.pending },
            update: { status: followStatusEnum.accepted }
        })
        if (!follow) throw new NotFoundException("follow request not found")
        return follow
    }

    async rejectFollowRequest(user: HUser, userId: string) {
        let follow = await this.followRepo.findOneAndDelete({
            filter: { follower: toObjectId(userId), following: toObjectId(user._id), status: followStatusEnum.pending }
        })
        if (!follow) throw new NotFoundException("follow request not found")
    }

    private async listRelations(
        filter: QueryFilter<any>,
        key: "follower" | "following",
        { page, limit }: { page: number, limit: number }
    ) {
        let result = await this.followRepo.pagination({ filter, options: { sort: { createdAt: -1 } }, page, limit })
        let users = await this.getUsersMap(result.data.map((f) => toObjectId(f[key])))
        return {
            data: result.data.map((f) => ({
                user: users.get(String(f[key])) ?? null,
                status: f.status,
                createdAt: f.createdAt
            })),
            meta: result.meta
        }
    }

    async getFollowers(user: HUser, query: { page: number, limit: number }) {
        return await this.listRelations({ following: toObjectId(user._id), status: followStatusEnum.accepted }, "follower", query)
    }

    async getFollowing(user: HUser, query: { page: number, limit: number }) {
        return await this.listRelations({ follower: toObjectId(user._id), status: followStatusEnum.accepted }, "following", query)
    }

    async getFollowRequests(user: HUser, query: { page: number, limit: number }) {
        return await this.listRelations({ following: toObjectId(user._id), status: followStatusEnum.pending }, "follower", query)
    }

    // ---------------------------------------------------------------- search & suggestions

    async search(user: HUser, { q, page, limit }: { q: string, page: number, limit: number }) {
        // every word must match the first name, the last name or the beginning of the email
        let words = q.split(/\s+/).filter(Boolean).slice(0, 5)
        let filter = {
            _id: { $ne: toObjectId(user._id) },
            confirmEmail: true,
            $and: [
                notDeleted,
                ...words.map((word) => {
                    let part = escapeRegex(word)
                    return { $or: [{ firstName: new RegExp(part, "i") }, { lastName: new RegExp(part, "i") }, { email: new RegExp(`^${part}`, "i") }] }
                })
            ]
        } as QueryFilter<IUser>
        return await this.userRepo.pagination({ filter, projection: LIST_FIELDS, options: { sort: { firstName: 1, lastName: 1 } }, page, limit })
    }

    // people followed by the people I follow (most mutual connections first), then newest users to fill the list
    async getSuggestions(user: HUser, limit: number) {
        let me = toObjectId(user._id)
        let relations = await this.followRepo.find({ filter: { follower: me } })
        let excluded = [me, ...relations.map((r) => toObjectId(r.following))]
        let followingIds = relations.filter((r) => r.status === followStatusEnum.accepted).map((r) => toObjectId(r.following))

        let mutual: { _id: Types.ObjectId, mutualConnections: number }[] = []
        if (followingIds.length) {
            mutual = await this.followRepo.aggregate([
                { $match: { follower: { $in: followingIds }, status: followStatusEnum.accepted, following: { $nin: excluded } } },
                { $group: { _id: "$following", mutualConnections: { $sum: 1 } } },
                { $sort: { mutualConnections: -1, _id: 1 } },
                { $limit: limit * 2 }
            ])
        }

        let users = await this.getUsersMap(mutual.map((m) => m._id))
        let result: { user: any, mutualConnections: number }[] = []
        for (let m of mutual) {
            let found = users.get(m._id.toString())
            if (found && result.length < limit) result.push({ user: found, mutualConnections: m.mutualConnections })
        }

        if (result.length < limit) {
            let skip = [...excluded, ...result.map((r) => toObjectId(r.user._id))]
            let others = await this.userRepo.find({
                filter: { _id: { $nin: skip }, confirmEmail: true, $and: [notDeleted] } as QueryFilter<IUser>,
                projection: LIST_FIELDS,
                options: { sort: { createdAt: -1 }, limit: limit - result.length }
            })
            result.push(...others.map((u) => ({ user: u, mutualConnections: 0 })))
        }
        return result
    }

}

export const userService = new UserService()