import useSWR from "swr";
import {MyChatMessage} from "@/types/entity";
import {MessageDbUtil} from "@/utils/db/MessageDbUtil";
import {useEffect, useState} from "react";

export interface MessagesProps {
    messages: MyChatMessage[];
    updateMessage: (messages: MyChatMessage) => Promise<void>;
    syncMessages: () => Promise<void>;
    deleteMessage: (messages: MyChatMessage) => Promise<void>;
}

const useMessages = (chatId: string | undefined, enableCloudSync: boolean): MessagesProps => {
    const messageDb = new MessageDbUtil(enableCloudSync);
    const [messages, setMessages] = useState<MyChatMessage[]>([]);
    const {
        data: fullMessages,
        mutate: fullMessageMutate
    } = useSWR(messageDb.REMOTE_KEY + chatId, () => messageDb.loadChatMessages(chatId ?? ''), {});

    const finalMessages = MessageDbUtil.computeFinalEntities(messages, fullMessages ?? []);
    useEffect(() => {
        const loadMessages = async () => {
            setMessages(await messageDb.loadLocalChatMessages(chatId ?? '') ?? []);
        };
        loadMessages();
        fullMessageMutate([]);
    }, [chatId]);
    const updateMessage = async (message: MyChatMessage) => {
        if (message.chatId.trim() === '') {
            throw new Error('chatId is empty');
        }
        await messageDb.updateEntity(message);
        setMessages(await messageDb.loadLocalChatMessages(message.chatId) ?? []);
    }

    const syncMessages = async () => {
        if (!enableCloudSync) {
            return;
        }
        await fullMessageMutate();
    }
    const deleteMessage = async (message: MyChatMessage) => {
        if (message.chatId.trim() === '') {
            throw new Error('chatId is empty');
        }
        await messageDb.deleteEntity(message);
        setMessages(await messageDb.loadLocalChatMessages(message.chatId) ?? []);
    }
    return {messages: finalMessages, updateMessage, syncMessages, deleteMessage};
}

export default useMessages;