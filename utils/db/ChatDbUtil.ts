import {BaseDbUtil, SyncOperation} from "@/utils/db/BaseDbUtil";
import {MyChat} from "@/types/entity";
import {chatDb} from "@/utils/db/db";
import Dexie, {IndexableType} from "dexie";

export class ChatDbUtil extends BaseDbUtil<MyChat> {
    protected readonly APT_PATH = '/api/sync/chat';
    public readonly LOCAL_KEY = 'chat-local';
    public readonly REMOTE_KEY = 'chat-remote';
    protected table: Dexie.Table<MyChat, IndexableType> = chatDb.chats;
    protected name: string = 'chat';
    emptyEntity(): MyChat {
        return new MyChat();
    }

    protected async loadCloudEntities(date: Date): Promise<MyChat[]> {
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


    protected async updateCloudEntities(ps: MyChat[]): Promise<void> {
        if (!ps || ps.length === 0) {
            console.log("no chats to update");
            return;
        }
        console.log("updateCloudChats", ps);
        let value = ps.map(p => this.toDTO(p));
        console.log("updateCloudChats", value);
        const response = await fetch(this.APT_PATH, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(value)
        });

        if (response.ok) {
            return;
        }

        throw new Error("cannot update cloud chat");
    }

    private static instance: ChatDbUtil;
    public static getInstance(): ChatDbUtil {
        if (!ChatDbUtil.instance) {
            ChatDbUtil.instance = new ChatDbUtil();
        }
        return ChatDbUtil.instance;
    }
}