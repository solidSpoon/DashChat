'use client';

import {useState} from 'react';

import {useRouter, useParams} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {useTheme} from 'next-themes';

import {HiChatBubbleLeft} from 'react-icons/hi2';
import {TbLayoutSidebarRightCollapse} from 'react-icons/tb';

import {Avatar, AvatarImage} from '@/components/ui/avatar';

import PromptItems from "@/components/landing/prompt/PromptItems";
import {PromptCard} from "@/components/landing/prompt/PromptCard";
import {Prompt} from "@/types/entity";
import {emptyPrompt} from "@/utils/db/PromptDbUtil";
import {useAtom} from "jotai/index";
import store from "@/hooks/store";

interface PromptSideProps {
    isShowPromptSide: boolean;
    changeShowPromptSide: () => void;
}

const PromptSide = ({isShowPromptSide, changeShowPromptSide}: PromptSideProps) => {
    const router = useRouter();

    const params = useParams();

    const i18Language = params?.locale as string;

    const [language, setLanguage] = useState(i18Language);

    const {theme, setTheme} = useTheme();

    const t = useTranslations('landing.chat');
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [isShowPromptCard, setIsShowPromptCard] = useAtom(store.isShowPromptCardAtom);
    const handleShowPrompt = (p: Prompt | null) => {
        if (prompt?.key === p?.key) {
            setPrompt(null);
            setIsShowPromptCard(false);
        } else {
            setPrompt(p);
            setIsShowPromptCard(true);
        }
    }


    return (
        <>
            {prompt && <PromptCard prompt={prompt} onClose={()=>handleShowPrompt(null)}/>}
            <aside className={'flex-none h-full flex-col gap-2 flex shadow rounded-lg bg-white/90 md:p-3 '}>
                <div className='flex items-start justify-between border-b'>
                    <div className='p-1 flex-1'>
                        <p className='from-green-400 to-blue-500 bg-gradient-to-r bg-clip-text text-lg font-semibold leading-none text-transparent md:text-xl'>Prompts</p>
                        <p className='text-xs font-medium'>{t("Prompt Side Description")}</p>
                    </div>
                    {isShowPromptSide &&
                        <button
                            className='inline-flex items-center space-x-1 rounded p-1 px-1 transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                            onClick={changeShowPromptSide}
                            aria-label='Nav'
                        >
                            <TbLayoutSidebarRightCollapse className="w-5 h-5"/>
                        </button>}
                </div>
                <div className='flex items-center justify-center'>
                    <button
                        className='inline-flex items-center space-x-1 rounded p-1 px-2 text-sm font-medium transition duration-200 ease-in-out hover:bg-gray-200 dark:hover:bg-stone-600'
                        onClick={() => setPrompt(emptyPrompt())}
                    >
                        <HiChatBubbleLeft/>
                        <span>{t('New Prompt')}</span>
                    </button>
                </div>
                <PromptItems showPrompt={handleShowPrompt} selectedPrompt={prompt}/>
            </aside>
        </>
    );
};

export default PromptSide;
