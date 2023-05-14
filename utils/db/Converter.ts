import {BaseEntity} from "@/types/entity";
import moment from "moment/moment";
import {Chat, Message, Prompt} from "@prisma/client";

export abstract class BaseConverter<T extends BaseEntity> {
    public fromDTO = (json: any): T => {
        return {
            ...json,
            clientCreatedAt: moment(json.clientCreatedAt).toDate(),
            clientUpdatedAt: moment(json.clientUpdatedAt).toDate(),
            serverCreatedAt: moment(json.serverCreatedAt).toDate(),
            serverUpdatedAt: moment(json.serverUpdatedAt).toDate(),
        };
    }

    public toDTO = (e: T): any => {
        return {
            ...prompt,
            clientCreatedAt: moment(e.clientCreatedAt).toISOString(),
            clientUpdatedAt: moment(e.clientUpdatedAt).toISOString(),
            serverCreatedAt: moment(e.serverCreatedAt).toISOString(),
            serverUpdatedAt: moment(e.serverUpdatedAt).toISOString(),
        };
    }
}

export class PromptConverter extends BaseConverter<Prompt> {
    public static readonly instance = new PromptConverter();
}

export class ChatConverter extends BaseConverter<Chat> {
    public static readonly instance = new ChatConverter();
}

export class MessageConverter extends BaseConverter<Message> {
    public static readonly instance = new MessageConverter();
}