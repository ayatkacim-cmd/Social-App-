import { SocialUser,Session,Challenge,type UserDoc } from '../../database/model/social.model';
import {HttpError} from '../../common/middleware/social-auth.middleware';
import {newId,newOtp,digest,signToken} from '../../common/utils/social.security';
import {sendOtp} from './services/mail.service';
export async function issue(user:UserDoc){const sid=newId();await Session.create({userId:user._id,jtiHash:digest(sid),expiresAt:new Date(Date.now()+30*86400000)});return {accessToken:signToken({sub:String(user._id),sid,ver:user.tokenVersion,typ:'access'},15*60),refreshToken:signToken({sub:String(user._id),sid,ver:user.tokenVersion,typ:'refresh'},30*86400),tokenType:'Bearer',accessExpiresIn:900};}
export async function createChallenge(user:UserDoc,purpose:'verify'|'reset',enforceCooldown=true){
    const previous=await Challenge.findOne({userId:user._id,purpose});
    if(enforceCooldown&&previous&&Date.now()-previous.lastSentAt.getTime()<60_000)throw new HttpError(429,'Try again after 60 seconds');
    const otp=newOtp();await sendOtp(user.email,otp,purpose);
    await Challenge.findOneAndUpdate({userId:user._id,purpose},{otpHash:digest(`${user._id}:${purpose}:${otp}`),attempts:0,lastSentAt:new Date(),expiresAt:new Date(Date.now()+600_000)},{upsert:true,new:true});
}
export async function consumeOtp(user:UserDoc,purpose:'verify'|'reset',otp:string){
    const doc=await Challenge.findOne({userId:user._id,purpose,expiresAt:{$gt:new Date()}});
    if(!doc||doc.attempts>=5)throw new HttpError(400,'Invalid or expired OTP');
    const found=await Challenge.findOneAndUpdate({_id:doc._id,attempts:{$lt:5}},{$inc:{attempts:1}},{new:true});
    if(!found)throw new HttpError(400,'Too many attempts');
    if(found.otpHash!==digest(`${user._id}:${purpose}:${otp}`))throw new HttpError(400,'Invalid or expired OTP');
    await Challenge.deleteOne({_id:doc._id});
}
