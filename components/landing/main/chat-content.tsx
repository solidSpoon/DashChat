import {useEffect, useRef} from 'react';

import {useTranslations} from 'next-intl';

import {toast} from 'react-hot-toast';

import store from '@/hooks/store';
import {useAtomValue} from 'jotai';

import {TbCopy, TbAB2, TbSpeakerphone, TbEdit} from 'react-icons/tb';

import {renderUserMessage, renderMarkdownMessage} from '@/utils/app/renderMessage';
import {MyChatMessage} from "@/types/entity";

const MainContent = ({
                         systemResponse,
                         waitingSystemResponse,
                         conversations,
                         reGenerate,
                         onEdit,
                         isSystemPromptEmpty,
                     }: {
    systemResponse: string;
    waitingSystemResponse: boolean;
    conversations: MyChatMessage[];
    reGenerate: (index: number) => void;
    onEdit: (index: number) => void;
    isSystemPromptEmpty: boolean;
}) => {
    const t = useTranslations('landing.main');

    const ttsConfig = useAtomValue(store.textToSpeechConfigAtom);

    const endOfMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (endOfMessageRef.current) {
            endOfMessageRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [conversations, systemResponse]);

    const onCopy = (index: number) => {
        navigator.clipboard.writeText(conversations[index].content);
        toast.success('Copied to clipboard');
    };

    const onSpeech = (index: number) => {
        if (typeof window !== 'undefined') {
            const synth = window.speechSynthesis;
            const voices = synth.getVoices();

            const utterance = new SpeechSynthesisUtterance(conversations[index].content);

            utterance.voice = voices.find((voice) => voice.name === ttsConfig.voice) || voices[0];
            utterance.rate = ttsConfig.speed;
            utterance.pitch = ttsConfig.pitch;

            synth.speak(utterance);
        }
    };

    return (
        <div className='mx-auto space-y-1 overflow-auto'>
            {conversations
                .filter((m) => m.role != 'system')
                .map((message, index) => {
                    const isUser = message.role === 'user';
                    const isLast = index === conversations.filter((m) => m.role != 'system').length - 1;

                    let streamResponse = null;

                    if (isLast && !isUser && waitingSystemResponse) {
                        streamResponse = renderMarkdownMessage(systemResponse);
                    }

                    return (
                        <div
                            className={`flex flex-col items-start rounded overflow-hidden px-3 py-6 justify-start ${isUser ? 'bg-gray-200' : 'bg-stone-200'}`}
                            key={index}>
                            <div
                                className={`flex select-none w-full items-center justify-between text-black space-x-2`}>
                                {isUser ? (
                                    <>
                                        <p className='text-base font-semibold'>You</p>
                                        <div>
                                            {!waitingSystemResponse && (
                                                <>
                                                    <button
                                                        className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                                        onClick={() => onEdit(index)}
                                                    >
                                                        <TbEdit/>
                                                        <span>{t('Edit')}</span>
                                                    </button>
                                                    <button
                                                        className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                                        onClick={() => onCopy(isSystemPromptEmpty ? index : index + 1)}
                                                    >
                                                        <TbCopy/>
                                                        <span>{t('Copy')}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className='text-base font-semibold'>AI</p>
                                        <div>


                                            {!waitingSystemResponse && (
                                                <>
                                                    <button
                                                        className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                                        onClick={() => onCopy(isSystemPromptEmpty ? index : index + 1)}
                                                    >
                                                        <TbCopy/>
                                                        <span>{t('Copy')}</span>
                                                    </button>
                                                    <button
                                                        className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                                        onClick={() => reGenerate(index)}
                                                    >
                                                        <TbAB2/>
                                                        <span>{t('Regenerate')}</span>
                                                    </button>
                                                    <button
                                                        className='inline-flex items-center space-x-0.5 rounded px-1 text-sm transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                                                        onClick={() => onSpeech(index)}
                                                    >
                                                        <TbSpeakerphone/>
                                                        <span>{t('Speech')}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div
                                className={` w-full space-y-3 py-7 px-5 text-sm
                                dark:bg-neutral-700 dark:text-white`}
                            >
                                {!isUser ? renderMarkdownMessage(message.content) : renderUserMessage(message.content)}
                                {streamResponse}
                            </div>
                        </div>
                    );
                })}
            <div ref={endOfMessageRef}/>
        </div>
    );
};

export default MainContent;
