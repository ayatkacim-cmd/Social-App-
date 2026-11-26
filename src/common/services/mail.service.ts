import {Attachment, createTransport, Transporter} from "nodemailer"
import { APP_EMAIL, APP_PASSWORD } from "../../config/config.service"


let transporter :Transporter =  createTransport({
    service : "gmail",
    auth:{
        user : APP_EMAIL,
        pass : APP_PASSWORD
    }
})
export const sendMail = async ({
    recipients,
    subject,
    attachments,
    html,
    text
}:{
    recipients :{
        to : string,
        cc? : string,
        bcc?:string
    },
    subject:string,
    html?:string,
    attachments?:Attachment[],
    text? : string
}) => {
    let info = await transporter.sendMail({
        from: `sarah project <${APP_EMAIL}>`,
        ...recipients,
        subject ,
        text ,
        html ,
        attachments
    })
    console.log(info.accepted)
}