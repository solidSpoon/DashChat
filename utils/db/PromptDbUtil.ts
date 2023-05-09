import {chatDb} from "@/utils/db/db";
import {Prompt} from "@/types/entity";
import {uuid} from "uuidv4";
export const emptyPrompt = ():Prompt => {
    return {
        id: uuid(),
        name: "",
        content: "",
        key: uuid(),
        index: 0,
        pinned: false
    };
}

export const fetchPrompts = async (): Promise<Prompt[]> => {
    return chatDb.prompts.toArray();
}