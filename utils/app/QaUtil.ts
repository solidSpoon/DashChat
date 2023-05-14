import {MyChatMessage} from "@/types/entity";


export async function getResp(
    serviceProvider: string,
    configPayload: any,
    messagesPayload: MyChatMessage[],
    onMessage: (chunk: string, finish: boolean) => void,
    onFail: () => void
): Promise<void> {
    const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            stream: true,
            serviceProvider: serviceProvider,
            config: configPayload,
            messages: messagesPayload.map((m) => m.toOpenAIMessage()),
        }),
    });
    if (!response.ok) {
        onFail();
        return;
    }
    const data = response.body;

    if (!data) {
        onFail();
        return;
    }
    const reader = data.getReader();
    const decoder = new TextDecoder();

    let done = false;

    while (!done) {
        console.log("reading")
        const {value, done: readerDone} = await reader.read();
        done = readerDone;
        const chunkValue = decoder.decode(value);
        onMessage(chunkValue, done)
    }
}