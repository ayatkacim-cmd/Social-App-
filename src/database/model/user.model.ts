import mongoose, { HydratedDocument } from "mongoose"
import { IUser } from "../../common/interface";
import { enums } from "../../common";
import { encrypting, myHash } from "../../common/security";
import { privacyEnum, providerEnum } from "../../common/enum";



let userSchema = new  mongoose.Schema<IUser>({
    firstName:{
        type:String,
        required : true,
        minLength: 3,
        maxLength :30,
        trim: true
    },
    lastName:{
        type:String,
        required : true,
        minLength: 3,
        maxLength :30,
        trim: true
    },
    email:{
        type:String,
        required : true,
        unique:true,
        lowercase: true,
        trim: true
    },
    password:{
        type:String,
        // google users sign in with oauth and have no password
        required : function (): boolean {
            return this.provider !== providerEnum.google
        },
        minLength: 6
    },
    DOB :Date,
    gender:{
        type: Number,
        enum:enums.genderEnum,
        default:enums.genderEnum.male
    },
    image:String,
    covers:[String],
    deletedAt:Date,
    confirmEmail:Boolean,
    phone: String,
    role:{
        type: Number,
        enum:enums.roleEnum,
        default:enums.roleEnum.user
    },
    provider:{
        type: Number,
        enum:enums.providerEnum,
        default:enums.providerEnum.system
    },
    privacy:{
        type: Number,
        enum: privacyEnum,
        default: privacyEnum.public
    },
    changedAt: Number

},{

    timestamps:true ,
    strict :true ,
    strictQuery: true,
    toJSON : {virtuals : true},
    toObject : {virtuals : true}
})

userSchema.virtual("fullName").set(function(value){
    let [firstName, lastName]= value.split(" ")
    this.firstName=firstName
    this.lastName=lastName
}).get(function(){
    return `${this.firstName} ${this.lastName}`
})


userSchema.pre(["findOne", "findOneAndUpdate"], { document: false, query: true }, function () {
  // console.log(this.getFilter())
  // console.log(this.getQuery())
    let { paranoid } = this.getFilter()
    if (paranoid !== false) {
        this.setQuery({ ...this.getQuery(), $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] })
    }
  // console.log(this.getQuery())
  // console.log(this.getFilter())
})

userSchema.pre(["updateOne", "findOneAndUpdate"], { document: false, query: true }, function () {
    let { paranoid } = this.getFilter()
    if (paranoid !== false) {
        this.setQuery({ ...this.getQuery(), $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] })
    }
})

userSchema.pre(["deleteOne", "findOneAndDelete"], { document: false, query: true }, function () {
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true, $ne: null } })
})



// userSchema.post("save", async function (doc: any) {
//     console.log("post save")
//     console.log(doc)
// })

// userSchema.pre("save", async function () {
//     console.log("pre save 2")
//     console.log(this.isSelected("extra"))
//     console.log(this.isSelected("extra.data"),"direct")
//     if (this.isModified("password"))this.password = await myHash(this.password)
//     if (this.isModified("phone"))this.phone = encrypting(this.phone)

// })

export type HUser = HydratedDocument<IUser>
//if u have user return it, if not create it
export default mongoose.model<IUser>("user", userSchema);