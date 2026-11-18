import {z} from 'zod';
export const email=z.email().transform(x=>x.toLowerCase().trim());
export const password=z.string().min(8).max(128);
export const signup=z.object({firstName:z.string().trim().min(2).max(50),lastName:z.string().trim().min(2).max(50),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/),email,password,confirmPassword:z.string(),phone:z.string().max(24).optional(),dob:z.iso.date().optional(),gender:z.string().max(24).optional()}).refine(v=>v.password===v.confirmPassword,{path:['confirmPassword'],message:'Passwords do not match'});

export const emailBody=z.object({email});
export const otpBody=z.object({email,otp:z.string().regex(/^\d{6}$/)});
export const loginBody=z.object({email,password:z.string()});
export const refreshBody=z.object({refreshToken:z.string()});
export const resetBody=z.object({email,otp:z.string().regex(/^\d{6}$/),newPassword:password});
export const googleBody=z.object({idToken:z.string().min(30)});
