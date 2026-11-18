import { Schema, model, Types } from 'mongoose';
export type Privacy = 'public' | 'private';
export interface UserDoc {
    _id: Types.ObjectId; firstName: string; lastName: string; username: string; email: string;
    passwordHash?: string; provider: 'local'|'google'; googleSub?: string; emailVerified: boolean;
    avatar?: string; bio?: string; phone?: string; dob?: Date; gender?: string;
    privacy: Privacy; followers: Types.ObjectId[]; following: Types.ObjectId[];
    followRequests: Types.ObjectId[]; tokenVersion: number; createdAt: Date; updatedAt: Date;
}
const userSchema = new Schema<UserDoc>({
    firstName: {type:String,required:true,trim:true,maxlength:50}, lastName:{type:String,required:true,trim:true,maxlength:50},
    username:{type:String,required:true,unique:true,lowercase:true,trim:true},
    email:{type:String,required:true,unique:true,lowercase:true,trim:true},
    passwordHash:{type:String,select:false}, provider:{type:String,enum:['local','google'],default:'local'},
    googleSub:{type:String,select:false}, emailVerified:{type:Boolean,default:false},
    avatar:String,bio:{type:String,maxlength:300},phone:String,dob:Date,gender:String,
    privacy:{type:String,enum:['public','private'],default:'public'},
    followers:[{type:Schema.Types.ObjectId,ref:'SocialUser'}],
    following:[{type:Schema.Types.ObjectId,ref:'SocialUser'}],
    followRequests:[{type:Schema.Types.ObjectId,ref:'SocialUser'}],
    tokenVersion:{type:Number,default:0},
},{timestamps:true});

export const SocialUser = model<UserDoc>('SocialUser',userSchema);
export interface SessionDoc {userId:Types.ObjectId; jtiHash:string; expiresAt:Date; revokedAt?:Date;}
const sessionSchema=new Schema<SessionDoc>({userId:{type:Schema.Types.ObjectId,ref:'SocialUser',required:true,index:true},jtiHash:{type:String,unique:true,required:true},expiresAt:{type:Date,required:true},revokedAt:Date},{timestamps:true});
sessionSchema.index({expiresAt:1},{expireAfterSeconds:0});
export const Session=model<SessionDoc>('SocialSession',sessionSchema);
export interface ChallengeDoc {userId:Types.ObjectId; purpose:'verify'|'reset'; otpHash:string; attempts:number; lastSentAt:Date; expiresAt:Date;}
const challengeSchema=new Schema<ChallengeDoc>({userId:{type:Schema.Types.ObjectId,required:true,index:true},purpose:{type:String,enum:['verify','reset'],required:true},otpHash:{type:String,required:true},attempts:{type:Number,default:0},lastSentAt:{type:Date,required:true},expiresAt:{type:Date,required:true}});
challengeSchema.index({userId:1,purpose:1},{unique:true});challengeSchema.index({expiresAt:1},{expireAfterSeconds:0});
export const Challenge=model<ChallengeDoc>('SocialChallenge',challengeSchema);
