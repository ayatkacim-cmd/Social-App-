import { z } from "zod"
import { GF } from "../../common"
import { AvailabilityEnum, languageEnum } from "../../common/enum"

// multipart/form-data sends everything as strings, JSON sends real numbers => accept both
const availability = () => z.coerce.number().pipe(z.enum(AvailabilityEnum, { error: "availability must be 0 (public), 1 (only me) or 2 (followers)" }))

// a single tag arrives as a string in multipart, as an array in JSON
const tags = (lang: languageEnum) => z.preprocess(
    (value) => typeof value === "string" ? [value] : value,
    z.array(GF.userId(lang)).max(20)
)

export let createPostSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        content: z.string().trim().min(1).max(5000).optional(),
        availability: availability().optional(),
        tags: tags(lang).optional()
    })
})

export let postIdSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        postId: GF.postId(lang)
    })
})

export let getMyPostsSchema = (lang: languageEnum) => z.object({
    query: z.strictObject({
        page: GF.page(lang).default(1),
        limit: GF.limit(lang).max(50).default(10)
    })
})

export let updatePostSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        postId: GF.postId(lang)
    }),
    body: z.strictObject({
        content: z.string().trim().min(1).max(5000).optional(),
        availability: z.enum(AvailabilityEnum, { error: "availability must be 0 (public), 1 (only me) or 2 (followers)" }).optional(),
        tags: z.array(GF.userId(lang)).max(20).optional()
    }).refine((data) => Object.keys(data).length > 0, { error: "at least one field is required" })
})