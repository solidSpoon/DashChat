import {BaseDbUtil, SyncOperation} from "@/utils/db/BaseDbUtil";
import {MyChat, MyChatMessage} from "@/types/entity";
import {chatDb} from "@/utils/db/db";
import Dexie, {IndexableType} from "dexie";
import {Message} from "@prisma/client";
import {MyUtil} from "@/utils/app/MyUtil";


export class MessageDbUtil extends BaseDbUtil<MyChatMessage> {
    protected readonly APT_PATH = '/api/sync/message';
    public readonly LOCAL_KEY = 'chat-message-local';
    public readonly REMOTE_KEY = 'chat-message-remote';
    protected table: Dexie.Table<MyChatMessage, IndexableType> = chatDb.messages;
    protected name: string = 'chat-message';

    emptyEntity(): MyChatMessage {
        return new MyChatMessage();
    }

    public async loadChatMessages(chatId: string): Promise<MyChatMessage[]> {
        let myChatMessages = (await this.loadEntities()).filter(p => p.chatId === chatId);
        console.log("loadChatMessages", myChatMessages);
        return myChatMessages;
    }

    public async loadLocalChatMessages(chatId: string): Promise<MyChatMessage[]> {
        return (await this.loadLocalEntities()).filter(p => p.chatId === chatId);
    }

    protected async loadCloudEntities(date: Date): Promise<MyChatMessage[]> {
        console.log("loadCloudChats", date);
        const response = await fetch(this.APT_PATH + '?after=' + date.toISOString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error("cannot fetch cloud prompts");
        }
        const data = await response.json();

        return data?.prompts?.map((p: any) => this.fromDTO(p));
    }


    protected async updateCloudEntities(ps: MyChatMessage[]): Promise<void> {
        if (!ps || ps.length === 0) {
            console.log("no chats to update");
            return;
        }
        const response = await fetch(this.APT_PATH, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ps.map(p => this.toDTO(p)))
        });

        if (response.ok) {
            return;
        }

        throw new Error("cannot update cloud chat");
    }

    private static instance: MessageDbUtil;

    public static getInstance(): MessageDbUtil {
        if (!MessageDbUtil.instance) {
            MessageDbUtil.instance = new MessageDbUtil();
        }
        return MessageDbUtil.instance;
    }
}