// db.ts
import Dexie, { Table } from 'dexie';
import {Chat, Message, Prompt} from "@prisma/client";
import {MyChat, MyChatMessage} from "@/types/entity";
export const EMPTY_KEY = -1;
export interface DbBase {
    id: string;
    key: string;
    index: number;
}
export class ChatDb extends Dexie {
    // 'friends' is added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    prompts!: Table<Prompt>;
    chats!: Table<MyChat>;
    messages!: Table<MyChatMessage>;
    /*
  clientUpdatedAt: Date
  serverUpdatedAt: Date
     */
    constructor() {
        super('dash-chat-db');
        this.version(2).stores({
            prompts: 'id, clientUpdatedAt, serverUpdatedAt, name, content', // Primary key and indexed props
            chats: 'id, clientUpdatedAt, serverUpdatedAt, topic', // Primary key and indexed props
            messages: 'id, clientUpdatedAt, serverUpdatedAt, content', // Primary key and indexed props
        });

    }
}

export const chatDb = new ChatDb();
