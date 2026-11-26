import mongoose, { HydratedDocument } from "mongoose"
import type { IPost } from "../../common/interface";
import { AvailabilityEnum } from "../../common/enum";
import { Types } from "mongoose";




let postSchema = new  mongoose.Schema<IPost>({
    content: {
        type: String,
        trim: true,
        maxLength: 5000,
        required: function (): boolean {
            return !(this?.attachments?.length! > 0)
        }
    },
    attachments: [String],
    availability: {
        enum: AvailabilityEnum,
        type: Number,
        default: AvailabilityEnum.PUBLIC
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    deletedAt: Date,
    restoredAt: Date,
    folderId: String,
    tags: [{ type: Types.ObjectId, ref: "user" }]

},{

    timestamps:true ,
    strict :true ,
    strictQuery: true,
    toJSON : {virtuals : true},
    toObject : {virtuals : true}
})

postSchema.index({ createdBy: 1, createdAt: -1 })

// soft delete: every read/update query ignores soft deleted posts unless `paranoid: false` is passed in the filter
postSchema.pre(["find", "findOne", "findOneAndUpdate", "updateOne", "updateMany", "countDocuments"],{ document: false, query: true }, function(){

    let {paranoid} = this.getFilter()
    if(paranoid !== false){
        let query = this.getQuery()
        this.setQuery({ ...query , $and:[...(query.$and ?? []), { $or:[{deletedAt:{$exists:false}},{ deletedAt:null}] }] })
    }

})

// hard delete is only allowed for posts that were already soft deleted (same rule as the user model)
postSchema.pre(["deleteOne" , "findOneAndDelete"],{ document: false, query: true }, function(){
    this.setQuery({ ...this.getQuery() , deletedAt:{$exists:true , $ne:null} })
})

export type HPost = HydratedDocument<IPost>

export default mongoose.model<IPost>("post", postSchema);
