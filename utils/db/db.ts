// db.ts
import Dexie, { Table } from 'dexie';
import { Prompt} from "@/types/entity";
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

    constructor() {
        super('dash-chat-db');
        this.version(1).stores({
            prompts: 'id, index, name, description', // Primary key and indexed props
            // conversations: '++id, index, name, selected', // Primary key and indexed props
            // conversationItems: '++id, index, conversationId, text, type' // Primary key and indexed props
        });

    }
}

export const chatDb = new ChatDb();
