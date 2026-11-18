import type { Request,Response,NextFunction } from 'express';
import { z } from 'zod';
import { SocialUser,Session, type UserDoc } from '../../database/model/social.model';
import { verifyToken,digest } from '../utils/social.security';


export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export const wrap=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};
export const parse=<T extends z.ZodType>(schema:T,value:unknown):z.infer<T>=>{const result=schema.safeParse(value);if(!result.success)throw new HttpError(400,result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));return result.data;};
export const publicUser=(u:UserDoc)=>({id:String(u._id),firstName:u.firstName,lastName:u.lastName,username:u.username,avatar:u.avatar||null,bio:u.bio||'',privacy:u.privacy,followersCount:u.followers?.length||0,followingCount:u.following?.length||0,emailVerified:u.emailVerified});
export const ownUser=(u:UserDoc)=>({...publicUser(u),email:u.email,phone:u.phone||null,dob:u.dob||null,gender:u.gender||null,provider:u.provider});
export type AuthedRequest=Request & { authUser?:UserDoc; authSid?:string };



export async function authenticated(req:Request,res:Response,next:NextFunction){
    try{
        const token=req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];if(!token)throw new HttpError(401,'Bearer access token required');
        let parsed;try{parsed=verifyToken(token,'access');}catch{throw new HttpError(401,'Invalid or expired access token');}
        const [user,session]=await Promise.all([SocialUser.findById(parsed.sub),Session.findOne({userId:parsed.sub,jtiHash:digest(parsed.sid),revokedAt:{$exists:false},expiresAt:{$gt:new Date()}})]);
        if(!user||!session||user.tokenVersion!==parsed.ver)throw new HttpError(401,'Session revoked');
        (req as AuthedRequest).authUser=user;(req as AuthedRequest).authSid=parsed.sid;next();
    }catch(e){next(e);}
}
export function current(req:Request){const u=(req as AuthedRequest).authUser;if(!u)throw new HttpError(401,'Unauthenticated');return u;}
export const mongoId=z.string().regex(/^[a-f\d]{24}$/i,'Invalid user id');
