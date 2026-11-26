import { HUser } from "../../database/model/user.model";


declare module "express-serve-static-core" {

  interface Request {
    validate: any;
    user :HUser;
  }

}