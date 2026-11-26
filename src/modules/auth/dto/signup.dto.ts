// export type signUpDTO = {
//     name: string,
//     email: string,
//     password: string
// }


import { z } from "zod";
import { signupSchema } from "../auth.vaildation";

export type signupDTO = z.infer<ReturnType<typeof signupSchema>>["body"]
