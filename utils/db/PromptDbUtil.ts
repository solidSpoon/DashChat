import {chatDb} from "@/utils/db/db";
import {v4 as uuid} from "uuid";
import {Prompt} from "@prisma/client";
import moment from "moment";


export default class PromptDbUtil {

    public static enableCloudSync = true;

    public static readonly REMOTE_KEY = 'chat-prompts-remote';
    public static readonly LOCAL_KEY = 'chat-prompts-local';
    private static readonly APT_PATH = '/api/nuser/prompt';
    private static readonly table = chatDb.prompts;

    public static loadLocalPrompts = async (): Promise<Prompt[]> => {
        return this.table.filter(p => !p.deleted).toArray();
    }


    public static loadPrompts = async (): Promise<Prompt[]> => {
        if (this.enableCloudSync) {
            await this.syncPrompts();
        }
        return this.table.filter(p => !p.deleted).toArray();
    }

    private static async syncPrompts() {
        console.log("sync prompts");
        const maxServerUpdatedAt = await PromptDbUtil.getLocalMaxServerUpdatedAt();
        let unSyncedPrompts = await this.loadLocalPromptAfter(maxServerUpdatedAt);
        console.log("unSyncedPrompts", unSyncedPrompts);
        await this.updateCloudPrompts(unSyncedPrompts);
        console.log("updateCloudPrompts done");
        const cloudPrompts = await this.loadCloudChats(maxServerUpdatedAt);
        console.log("cloudPrompts", cloudPrompts);
        await PromptDbUtil.updateLocalPrompts(cloudPrompts);
        console.log("sync prompts done");
    }

    public static loadLocalPromptAfter = async (after: Date): Promise<Prompt[]> => {
        return chatDb.prompts.filter(p => !p.deleted && p.clientUpdatedAt > after).toArray();
    }

    /**
     * 获取本地 serverUpdatedAt 最大的值
     */
    public static getLocalMaxServerUpdatedAt = async (): Promise<Date> => {
        const lastUpdatedPrompt = await chatDb.prompts.orderBy('serverUpdatedAt').last();
        if (lastUpdatedPrompt) {
            return lastUpdatedPrompt.serverUpdatedAt;
        }
        return new Date(0);
    }

    public static emptyPrompt = (): Prompt => {
        return {
            id: uuid(),
            name: "",
            content: "",
            pinned: false,
            clientCreatedAt: new Date(),
            clientUpdatedAt: new Date(),
            serverCreatedAt: new Date(0),
            serverUpdatedAt: new Date(0),
            authorId: '',
            deleted: false,
        };
    }


    public static async updatePrompt(p: Prompt): Promise<void> {
        p = {...p, clientUpdatedAt: new Date()};
        if (this.enableCloudSync) {
            await this.updateCloudPrompts([p]);
        }
        chatDb.prompts.put(p);
    }

    private static async updateCloudPrompts(ps: Prompt[]): Promise<void> {
        if (!ps || ps.length === 0) {
            console.log("no prompts to update");
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

        throw new Error("cannot update cloud prompt");
    }


    public static async deletePrompt(p: Prompt): Promise<void> {
        p = {...p, deleted: true, clientUpdatedAt: new Date()};
        if (this.enableCloudSync) {
            await this.updateCloudPrompts([p]);
        }
        chatDb.prompts.put(p);
    }

    private static async loadCloudChats(date: Date): Promise<Prompt[]> {
        console.log("loadCloudPrompts", date);
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

    /**
     * 根据 clientUpdatedAt 更新本地 prompts
     * @param cloudPrompts
     * @private
     */
    private static async updateLocalPrompts(cloudPrompts: Prompt[]) {
        for (const cloudPrompt of cloudPrompts) {
            // 获取本地数据库中的相同ID的提示
            const localPrompt = await chatDb.prompts.get(cloudPrompt.id);
            if (localPrompt) {
                // 如果本地提示的 clientUpdatedAt 小于云端提示的 clientUpdatedAt，
                // 则使用云端的提示更新本地提示
                if (localPrompt.clientUpdatedAt <= cloudPrompt.clientUpdatedAt) {
                    await chatDb.prompts.put(cloudPrompt);
                }
            } else {
                // 如果本地数据库中没有这个提示，直接添加
                await chatDb.prompts.add(cloudPrompt);
            }
        }
    }

    public static fromDTO = (json: any): Prompt => {
        return {
            ...json,
            clientCreatedAt: moment(json.clientCreatedAt).toDate(),
            clientUpdatedAt: moment(json.clientUpdatedAt).toDate(),
            serverCreatedAt: moment(json.serverCreatedAt).toDate(),
            serverUpdatedAt: moment(json.serverUpdatedAt).toDate(),
        };
    }

    public static toDTO = (prompt: Prompt): any => {
        return {
            ...prompt,
            clientCreatedAt: moment(prompt.clientCreatedAt).toISOString(),
            clientUpdatedAt: moment(prompt.clientUpdatedAt).toISOString(),
            serverCreatedAt: moment(prompt.serverCreatedAt).toISOString(),
            serverUpdatedAt: moment(prompt.serverUpdatedAt).toISOString(),
        };
    }

}