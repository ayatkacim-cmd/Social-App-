import {z} from 'zod';
import {mongoId} from '../../common/middleware/social-auth.middleware';
export const updateProfileBody=z.strictObject({firstName:z.string().trim().min(2).max(50).optional(),lastName:z.string().trim().min(2).max(50).optional(),bio:z.string().max(300).optional(),avatar:z.url().max(2000).optional(),phone:z.string().max(24).optional(),gender:z.string().max(24).optional(),dob:z.iso.date().optional()});
export const privacyBody=z.object({privacy:z.enum(['public','private'])});
export const searchQuery=z.object({q:z.string().trim().min(1).max(50),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(50).default(10)});
export const suggestionQuery=z.object({limit:z.coerce.number().int().min(1).max(30).default(10)});
export const userIdParams=z.object({id:mongoId});
