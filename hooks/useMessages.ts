import useSWR from "swr";
import {MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";
import useBase from "@/hooks/useBase";

export interface MessagesResult {
    messages: MyChatMessage[];
    updateMessage: (messages: MyChatMessage) => Promise<void>;
    syncMessages: () => Promise<void>;
    deleteMessage: (messages: MyChatMessage) => Promise<void>;
}

export interface LoadParam {
    chatId: string;
}

const useMessages = (chatId: string | undefined, enableCloudSync: boolean): MessagesResult => {
    const messageDb = new MessageDbUtil(enableCloudSync);
    const loadLocalEntities = () => messageDb.loadLocalChatMessages(chatId??'');
    const loadFullEntities = () => messageDb.loadChatMessages(chatId??'');
    const updateLocalEntity = async (message: MyChatMessage) => {
        if (message.chatId.trim() === '') {
            throw new Error('chatId is empty');
        }
        await messageDb.updateEntity(message);
    }
    const deleteLocalEntity = async (message: MyChatMessage) => {
        if (message.chatId.trim() === '') {
            throw new Error('chatId is empty');
        }
        await messageDb.deleteEntity(message);
    }
    const {
        messages,
        deleteEntity,
        updateEntity,
        syncEntities,
    } = useBase<MyChatMessage>({
        loadLocalEntities: loadLocalEntities,
        loadFullEntities: loadFullEntities,
        localKey: messageDb.LOCAL_KEY + chatId,
        remoteKey: messageDb.REMOTE_KEY + chatId,
        updateLocalEntity: updateLocalEntity,
        enableCloudSync: enableCloudSync,
        deleteLocalEntity: deleteLocalEntity,
    });

    return {
        messages: messages,
        updateMessage: updateEntity,
        syncMessages: syncEntities,
        deleteMessage: deleteEntity,
    };
}

export default useMessages;