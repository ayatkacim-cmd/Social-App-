import express from 'express';
import mongoose from 'mongoose';
import { cfg } from './config/runtime';
import { socialAuthRouter } from './modules/auth';
import { socialUserRouter } from './modules/users';
import { HttpError } from './common/middleware/social-auth.middleware';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'32kb'}));

app.get('/',(_req,res)=>res.json({message:'Social App API running',docs:'/api-docs'}));
app.get('/api-docs',(_req,res)=>res.json({auth:['POST /auth/signup','POST /auth/verify-email','POST /auth/resend-verification','POST /auth/login','POST /auth/refresh','POST /auth/logout','POST /auth/logout-all','POST /auth/forgot-password','POST /auth/reset-password','POST /auth/google'],users:['GET /users/me','PATCH /users/me','PATCH /users/settings/privacy','GET /users/search?q=','GET /users/suggestions','GET /users/:id','POST /users/:id/follow','DELETE /users/:id/follow','GET /users/me/follow-requests','POST /users/:id/accept','DELETE /users/:id/reject']}));
app.use('/auth',socialAuthRouter);app.use('/users',socialUserRouter);

app.use((_req,_res,next)=>next(new HttpError(404,'Endpoint not found')));
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    const e=err as {status?:number;code?:number;message?:string};const status=e.status||(e.code===11000?409:500);
    if(status>=500)console.error('Server error:',err);
    res.status(status).json({message:status===500?'Internal server error':e.message||'Request failed'});
});
mongoose.connect(cfg.db).then(()=>{app.listen(cfg.port,()=>console.log(`Social App on port:${cfg.port}`));}).catch(e=>{console.error('MongoDB connection failed:',e);process.exit(1);});
export {app};
