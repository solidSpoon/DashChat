import {DbBase} from "@/utils/db/db";

// export interface LocalPrompt extends DbBase {
//     name: string;
//     content: string;
//     pinned: boolean;
//     createdAt: Date|undefined;
//     updatedAt: Date|undefined;
//     authorId: string|undefined;
// }

export interface PromptVo extends LocalPrompt {
    selected: boolean;
}