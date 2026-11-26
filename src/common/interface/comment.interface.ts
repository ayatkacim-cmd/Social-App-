import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { IPost } from "./post.interface";

export interface IComment {
    paranoid?: boolean;
    content: string;
    post: Types.ObjectId | IPost;
    createdBy: Types.ObjectId | IUser;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
