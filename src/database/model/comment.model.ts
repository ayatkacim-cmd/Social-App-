import mongoose, { HydratedDocument, Types } from "mongoose"
import type { IComment } from "../../common/interface"

let commentSchema = new mongoose.Schema<IComment>({
    content: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    post: {
        type: Types.ObjectId,
        ref: "post",
        required: true
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    deletedAt: Date
},{
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

commentSchema.index({ post: 1, createdAt: 1 })

// soft delete: every read/update query ignores soft deleted comments unless `paranoid: false` is passed in the filter
commentSchema.pre(["find", "findOne", "findOneAndUpdate", "updateOne", "updateMany", "countDocuments"], { document: false, query: true }, function () {
    let { paranoid } = this.getFilter()
    if (paranoid !== false) {
        let query = this.getQuery()
        this.setQuery({ ...query, $and: [...(query.$and ?? []), { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }] })
    }
})

commentSchema.pre(["deleteOne", "findOneAndDelete"], { document: false, query: true }, function () {
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true, $ne: null } })
})

export type HComment = HydratedDocument<IComment>

export default mongoose.model<IComment>("comment", commentSchema)
