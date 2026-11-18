import {SocialUser, type UserDoc} from '../../database/model/social.model';
import {HttpError,publicUser} from '../../common/middleware/social-auth.middleware';

export async function searchUsers(viewer:UserDoc,q:string,page:number,limit:number){
    const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const where={$or:[{username:{$regex:escaped,$options:'i'}},{firstName:{$regex:escaped,$options:'i'}},{lastName:{$regex:escaped,$options:'i'}}]};
    const [users,total]=await Promise.all([SocialUser.find(where).skip((page-1)*limit).limit(limit).sort({createdAt:-1}),SocialUser.countDocuments(where)]);
    const cards=users.map(u=>u.privacy==='private'&&!u.followers.some(id=>String(id)===String(viewer._id))&&String(u._id)!==String(viewer._id)?{id:String(u._id),username:u.username,firstName:u.firstName,lastName:u.lastName,avatar:u.avatar||null,privacy:'private'}:publicUser(u));
    return {users:cards,pagination:{page,limit,total}};
}
export async function suggestUsers(user:UserDoc,limit:number){
    const users=await SocialUser.find({_id:{$nin:[user._id,...user.following]},privacy:'public'}).sort({createdAt:-1}).limit(limit);
    return {users:users.map(publicUser)};
}
export async function followUser(viewer:UserDoc,id:string){
    if(id===String(viewer._id))throw new HttpError(400,'Cannot follow yourself');
    const target=await SocialUser.findById(id);if(!target)throw new HttpError(404,'User not found');
    if(target.followers.some(x=>String(x)===String(viewer._id)))return {status:'following'};
    if(target.privacy==='private'){await SocialUser.updateOne({_id:target._id},{$addToSet:{followRequests:viewer._id}});return {status:'requested'};}
    await SocialUser.updateOne({_id:target._id},{$addToSet:{followers:viewer._id}});
    await SocialUser.updateOne({_id:viewer._id},{$addToSet:{following:target._id}});
    return {status:'following'};
}
export async function unfollowUser(viewer:UserDoc,id:string){
    await Promise.all([SocialUser.updateOne({_id:id},{$pull:{followers:viewer._id,followRequests:viewer._id}}),SocialUser.updateOne({_id:viewer._id},{$pull:{following:id}})]);
    return {status:'unfollowed'};
}
export async function acceptRequest(viewer:UserDoc,id:string){
    const target=await SocialUser.findOneAndUpdate({_id:viewer._id,followRequests:id},{$pull:{followRequests:id},$addToSet:{followers:id}},{new:true});
    if(!target)throw new HttpError(404,'Follow request not found');
    await SocialUser.updateOne({_id:id},{$addToSet:{following:viewer._id}});
    return {status:'accepted'};
}
export async function rejectRequest(viewer:UserDoc,id:string){
    await SocialUser.updateOne({_id:viewer._id},{$pull:{followRequests:id}});
    return {status:'rejected'};
}
