// db.ts
import Dexie, { Table } from 'dexie';
import {Prompt} from "@prisma/client";
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
    // conversations!: Table<Conversation>;
    // conversationItems!: Table<ConversationItem>;

    /*
  clientUpdatedAt: Date
  serverUpdatedAt: Date
     */
    constructor() {
        super('dash-chat-db');
        this.version(1).stores({
            prompts: 'id, clientUpdatedAt, serverUpdatedAt, name, content', // Primary key and indexed props
            // conversations: '++id, index, name, selected', // Primary key and indexed props
            // conversationItems: '++id, index, conversationId, text, type' // Primary key and indexed props
        });

    }
}

export const chatDb = new ChatDb();
