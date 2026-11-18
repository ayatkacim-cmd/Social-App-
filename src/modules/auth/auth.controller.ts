import {Router} from 'express';
import {SocialUser,Session} from '../../database/model/social.model';
import {HttpError,wrap,parse,authenticated,current,ownUser} from '../../common/middleware/social-auth.middleware';
import {hashPassword,checkPassword,newId,digest,verifyToken} from '../../common/utils/social.security';
import {cfg} from '../../config/runtime';
import {signup,otpBody,emailBody,loginBody,refreshBody,resetBody,googleBody} from './auth.validation';
import {issue,createChallenge,consumeOtp} from './auth.service';
const router=Router();
router.post('/signup',wrap(async(req,res)=>{
 const data=parse(signup,req.body);
 if(await SocialUser.exists({$or:[{email:data.email},{username:data.username}]}))throw new HttpError(409,'Email or username already exists');
 const user=await SocialUser.create({firstName:data.firstName,lastName:data.lastName,username:data.username,email:data.email,passwordHash:await hashPassword(data.password),...(data.phone!==undefined?{phone:data.phone}:{}),...(data.dob!==undefined?{dob:new Date(data.dob)}:{}),...(data.gender!==undefined?{gender:data.gender}:{}),provider:'local',emailVerified:false});
 try{await createChallenge(user,'verify',false);}catch(e){await SocialUser.deleteOne({_id:user._id});throw e;}
 res.status(201).json({message:'Account created. Verify your email with the OTP.',user:ownUser(user)});
}));
router.post('/verify-email',wrap(async(req,res)=>{
 const {email:mail,otp}=parse(otpBody,req.body);
 const user=await SocialUser.findOne({email:mail});if(!user)throw new HttpError(400,'Invalid OTP');
 if(user.emailVerified)throw new HttpError(409,'Email already verified');
 await consumeOtp(user,'verify',otp);user.emailVerified=true;await user.save();res.json({message:'Email verified'});
}));
router.post('/resend-verification',wrap(async(req,res)=>{
 const {email:mail}=parse(emailBody,req.body);const user=await SocialUser.findOne({email:mail});
 if(user&&!user.emailVerified)await createChallenge(user,'verify');res.json({message:'If verification is pending, a new code has been sent'});
}));
router.post('/login',wrap(async(req,res)=>{
 const data=parse(loginBody,req.body);
 const user=await SocialUser.findOne({email:data.email}).select('+passwordHash');
 if(!user?.passwordHash||!await checkPassword(data.password,user.passwordHash))throw new HttpError(401,'Invalid credentials');
 if(!user.emailVerified)throw new HttpError(403,'Verify your email first');
 res.json({message:'Logged in',user:ownUser(user),tokens:await issue(user)});
}));
router.post('/refresh',wrap(async(req,res)=>{
 const {refreshToken}=parse(refreshBody,req.body);
 let token;try{token=verifyToken(refreshToken,'refresh');}catch{throw new HttpError(401,'Invalid refresh token');}
 // Atomic session revocation makes refresh tokens one-time use.
 const revoked=await Session.findOneAndUpdate({userId:token.sub,jtiHash:digest(token.sid),revokedAt:{$exists:false},expiresAt:{$gt:new Date()}},{$set:{revokedAt:new Date()}},{new:true});
 if(!revoked)throw new HttpError(401,'Refresh token already used or revoked');
 const user=await SocialUser.findById(token.sub);if(!user||user.tokenVersion!==token.ver)throw new HttpError(401,'Session revoked');
 res.json({tokens:await issue(user)});
}));
router.post('/logout',authenticated,wrap(async(req,res)=>{await Session.updateOne({userId:current(req)._id,jtiHash:digest((req as typeof req & {authSid:string}).authSid)},{$set:{revokedAt:new Date()}});res.json({message:'Logged out'});}));
router.post('/logout-all',authenticated,wrap(async(req,res)=>{const user=current(req);await SocialUser.updateOne({_id:user._id},{$inc:{tokenVersion:1}});await Session.updateMany({userId:user._id,revokedAt:{$exists:false}},{$set:{revokedAt:new Date()}});res.json({message:'All sessions revoked'});}));
router.post('/forgot-password',wrap(async(req,res)=>{
 const {email:mail}=parse(emailBody,req.body);const user=await SocialUser.findOne({email:mail});if(user&&user.provider==='local')await createChallenge(user,'reset');res.json({message:'If the account exists, a reset code has been sent'});
}));
router.post('/reset-password',wrap(async(req,res)=>{
 const {email:mail,otp,newPassword}=parse(resetBody,req.body);
 const user=await SocialUser.findOne({email:mail});if(!user||user.provider!=='local')throw new HttpError(400,'Invalid reset request');
 await consumeOtp(user,'reset',otp);user.passwordHash=await hashPassword(newPassword);user.tokenVersion++;await user.save();await Session.updateMany({userId:user._id},{$set:{revokedAt:new Date()}});res.json({message:'Password reset. Please login again'});
}));
router.post('/google',wrap(async(req,res)=>{
 const {idToken}=parse(googleBody,req.body);
 if(!cfg.googleClientId)throw new HttpError(503,'Google sign in not configured');
 // Google's tokeninfo verifies the ID token signature and claims server-side.
 const google=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
 if(!google.ok)throw new HttpError(401,'Invalid Google ID token');
 const payload=await google.json() as Record<string,string>;
 if(payload.aud!==cfg.googleClientId||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss||'')||payload.email_verified!=='true'||!payload.sub||!payload.email)throw new HttpError(401,'Google token claims invalid');
 const mail=payload.email.toLowerCase();let user=await SocialUser.findOne({email:mail}).select('+googleSub');
 if(user&&user.provider!=='google')throw new HttpError(409,'Account uses email/password. Login with password');
 if(user&&user.googleSub!==payload.sub)throw new HttpError(401,'Google account mismatch');
 if(!user){let username=`${(mail.split('@')[0]||'google').replace(/[^a-z0-9_.]/g,'').slice(0,16)}_${newId().slice(0,6)}`;
  user=await SocialUser.create({firstName:payload.given_name||'Google',lastName:payload.family_name||'User',email:mail,username,...(payload.picture!==undefined?{avatar:payload.picture}:{}),provider:'google',googleSub:payload.sub,emailVerified:true});}
 res.json({message:'Google sign in successful',user:ownUser(user),tokens:await issue(user)});
}));
export {router as socialAuthRouter};

