import {DbBase} from "@/utils/db/db";

export interface Prompt extends DbBase {
    name: string;
    content: string;
    pinned: boolean;
}

export interface PromptVo extends Prompt {
    selected: boolean;
}