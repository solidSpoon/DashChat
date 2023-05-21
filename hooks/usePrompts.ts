import useSWR from "swr";
import {MyChatMessage, MyPrompt} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";
import useBase from "@/hooks/useBase";
import PromptDbUtil from "@/utils/db/PromptDbUtil";

export interface UsePromptResult {
    prompts: MyPrompt[];
    updatePrompt: (messages: MyPrompt) => Promise<void>;
    deletePrompt: (messages: MyPrompt) => Promise<void>;
}

const usePrompts = (enableCloudSync: boolean): UsePromptResult => {
    const promptDb = new PromptDbUtil(enableCloudSync);
    const loadLocalEntities = () => promptDb.loadLocalEntitiesIncludeRecentDeleted();
    const loadFullEntities = () => promptDb.loadEntitiesIncludeRecentDeleted();
    const updateLocalEntity = async (prompt: MyPrompt) => await promptDb.updateEntity(prompt);

    const deleteLocalEntity = async (prompt: MyPrompt) => await promptDb.deleteEntity(prompt);

    const {
        messages,
        deleteEntity,
        updateEntity,
        syncEntities
    } = useBase<MyPrompt>({
        loadLocalEntities: loadLocalEntities,
        loadFullEntities: loadFullEntities,
        localKey: promptDb.LOCAL_KEY,
        remoteKey: promptDb.REMOTE_KEY,
        updateLocalEntity: updateLocalEntity,
        enableCloudSync: enableCloudSync,
        deleteLocalEntity: deleteLocalEntity,
    });

    const updatePrompt = async (p: MyPrompt) => {
        await updateEntity(p);
        await syncEntities();
    }
    const deletePrompt = async (p: MyPrompt) => {
        await deleteEntity(p);
        await syncEntities();
    }

    return {
        prompts: messages,
        updatePrompt: updatePrompt,
        deletePrompt: deletePrompt,
    };
}

export default usePrompts;