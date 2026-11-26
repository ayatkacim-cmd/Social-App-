import mongoose, { HydratedDocument, Types } from "mongoose"
import type { IFollow } from "../../common/interface"
import { followStatusEnum } from "../../common/enum"

let followSchema = new mongoose.Schema<IFollow>({
    follower: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    following: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    status: {
        type: Number,
        enum: followStatusEnum,
        default: followStatusEnum.accepted
    }
},{
    timestamps: true,
    strict: true,
    strictQuery: true
})

// one relation per (follower, following) pair => no duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true })
followSchema.index({ following: 1, status: 1, createdAt: -1 })

export type HFollow = HydratedDocument<IFollow>

export default mongoose.model<IFollow>("follow", followSchema)
