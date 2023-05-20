import {chatDb} from "@/utils/db/db";
import {v4 as uuid} from "uuid";
import {Prompt} from "@prisma/client";
import {BaseDbUtil} from "@/utils/db/BaseDbUtil";


export default class PromptDbUtil extends BaseDbUtil<Prompt> {

    protected readonly name: string = 'prompt';
    public readonly REMOTE_KEY = 'chat-prompts-remote';
    public readonly LOCAL_KEY = 'chat-prompts-local';
    protected readonly APT_PATH = '/api/sync/prompt';
    protected readonly table = chatDb.prompts;

    public emptyEntity = (): Prompt => {
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

    protected async updateCloudEntities(ps: Prompt[]): Promise<void> {
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


    protected async loadCloudEntities(date: Date): Promise<Prompt[]> {
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

    // public static readonly instance: PromptDbUtil = new PromptDbUtil(true);
}