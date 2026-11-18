import {Router} from 'express';
import {SocialUser} from '../../database/model/social.model';
import {HttpError,wrap,parse,authenticated,current,ownUser,publicUser} from '../../common/middleware/social-auth.middleware';
import {updateProfileBody,privacyBody,searchQuery,suggestionQuery,userIdParams} from './users.validation';
import {searchUsers,suggestUsers,followUser,unfollowUser,acceptRequest,rejectRequest} from './users.service';
const router=Router();router.use(authenticated);
router.get('/me',wrap(async(req,res)=>res.json({user:ownUser(current(req))})));


router.patch('/me',wrap(async(req,res)=>{
    const update=parse(updateProfileBody,req.body);
    const user=await SocialUser.findByIdAndUpdate(current(req)._id,{$set:{...update,...(update.dob?{dob:new Date(update.dob)}:{})}},{new:true,runValidators:true});res.json({user:ownUser(user!)});
}));


router.patch('/settings/privacy',wrap(async(req,res)=>{
    const {privacy}=parse(privacyBody,req.body);const user=await SocialUser.findByIdAndUpdate(current(req)._id,{$set:{privacy}},{new:true});
 // Existing follow requests remain pending until approved or declined.
    res.json({user:ownUser(user!)});
}));


router.get('/search',wrap(async(req,res)=>{const {q,page,limit}=parse(searchQuery,req.query);res.json(await searchUsers(current(req),q,page,limit));}));
router.get('/suggestions',wrap(async(req,res)=>{const {limit}=parse(suggestionQuery,req.query);res.json(await suggestUsers(current(req),limit));}));
router.get('/:id',wrap(async(req,res)=>{
    const {id}=parse(userIdParams,req.params);const user=await SocialUser.findById(id);if(!user)throw new HttpError(404,'User not found');
    const viewer=current(req);const isSelf=String(user._id)===String(viewer._id);const follows=user.followers.some(id=>String(id)===String(viewer._id));
    // Private profiles expose only a minimal card until following is approved.
    if(user.privacy==='private'&&!isSelf&&!follows){res.json({user:{id:String(user._id),username:user.username,firstName:user.firstName,lastName:user.lastName,avatar:user.avatar||null,privacy:'private'},isFollowing:false,hasPendingRequest:user.followRequests.some(id=>String(id)===String(viewer._id))});return;}
    res.json({user:isSelf?ownUser(user):publicUser(user),isFollowing:follows});
}));


router.post('/:id/follow',wrap(async(req,res)=>{const {id}=parse(userIdParams,req.params);res.json(await followUser(current(req),id));}));
router.delete('/:id/follow',wrap(async(req,res)=>{const {id}=parse(userIdParams,req.params);res.json(await unfollowUser(current(req),id));}));
router.get('/me/follow-requests',wrap(async(req,res)=>{
    const user=await SocialUser.findById(current(req)._id).populate('followRequests','firstName lastName username avatar privacy');res.json({requests:user?.followRequests||[]});
}));
router.post('/:id/accept',wrap(async(req,res)=>{const {id}=parse(userIdParams,req.params);res.json(await acceptRequest(current(req),id));}));
router.delete('/:id/reject',wrap(async(req,res)=>{const {id}=parse(userIdParams,req.params);res.json(await rejectRequest(current(req),id));}));
export {router as socialUserRouter};
