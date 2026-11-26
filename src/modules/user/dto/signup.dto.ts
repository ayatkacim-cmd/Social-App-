// export type signUpDTO = {
//     name: string,
//     email: string,
//     password: string
// }


import { z } from "zod";
import { softDeleteSchema } from "../user.vaildation";

export type softDeleteDto = z.infer<ReturnType<typeof softDeleteSchema>>["body"]
