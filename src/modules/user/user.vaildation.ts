import { z } from "zod"
import { GF } from "../../common"
import { languageEnum, privacyEnum } from "../../common/enum"

export let softDeleteSchema = (lang: languageEnum) => z.object({

    body: z.strictObject({
        userId: GF.userId(lang)
    })
})

export let getUserSchema = (lang: languageEnum) => z.object({
    params: z.strictObject({
        userId: GF.userId(lang)
    })
})


const paginationQuery = (lang: languageEnum) => ({
    page: GF.page(lang).default(1),
    limit: GF.limit(lang).max(50).default(10)
})

export let paginationSchema = (lang: languageEnum) => z.object({
    query: z.strictObject(paginationQuery(lang))
})

export let updateProfileSchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        firstName: z.string().trim().min(3).max(30).optional(),
        lastName: z.string().trim().min(3).max(30).optional(),
        phone: GF.phone(lang).optional(),
        gender: GF.gender(lang).optional(),
        DOB: z.string().refine((value) => !Number.isNaN(Date.parse(value)), { error: "invalid date" }).optional()
    }).refine((data) => Object.keys(data).length > 0, { error: "at least one field is required" })
})

export let privacySchema = (lang: languageEnum) => z.object({
    body: z.strictObject({
        privacy: z.enum(privacyEnum, { error: "privacy must be 0 (public) or 1 (private)" })
    })
})

export let searchUsersSchema = (lang: languageEnum) => z.object({
    query: z.strictObject({
        q: z.string().trim().min(1).max(50),
        ...paginationQuery(lang)
    })
})

export let suggestionsSchema = (lang: languageEnum) => z.object({
    query: z.strictObject({
        limit: GF.limit(lang).max(50).default(10)
    })
})
