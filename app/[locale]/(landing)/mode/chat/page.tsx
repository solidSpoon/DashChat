'use client';

import store from '@/hooks/store';
import {useAtom, useAtomValue} from 'jotai';

import LandingHeader from '@/components/landing/main/header';
import ChatMain from '@/components/landing/main/chat-main';
import PromptSide from "@/components/landing/prompt/PromptSide";
import {PromptCard} from "@/components/landing/prompt/PromptCard";

export default function ChatModePage() {
    const isHiddenSide = useAtomValue(store.isHiddenSideAtom);
    const [isShowPromptSide, setIsShowPromptSide] = useAtom(store.isShowPromptSideAtom);
    const [, setIsShowPromptCardAtom] = useAtom(store.isShowPromptCardAtom);
    const changeShowPromptSide = () => {
        setIsShowPromptCardAtom(false);
        setIsShowPromptSide(!isShowPromptSide);
    }

    return (
        <div className={`h-screen flex p-2 flex-col gap-2 ${!isHiddenSide && 'md:ml-80'}`}>
            <LandingHeader/>
            <div className='flex-1 h-0 flex gap-2 justify-end'>
                <ChatMain isShowPromptSide={isShowPromptSide} changeShowPromptSide={changeShowPromptSide}/>
                {isShowPromptSide &&
                    <PromptSide isShowPromptSide={isShowPromptSide} changeShowPromptSide={changeShowPromptSide}/>}
            </div>
        </div>
    );
}
