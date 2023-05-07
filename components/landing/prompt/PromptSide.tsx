'use client';

import {useState} from 'react';

import Link from 'next/link';
import {useRouter, useParams} from 'next/navigation';

import {useTranslations} from 'next-intl';

import {signOut} from 'next-auth/react';

import {User} from '@prisma/client';

import store from '@/hooks/store';
import {useAtom} from 'jotai';

import {useTheme} from 'next-themes';

import {GrGithub} from 'react-icons/gr';
import {RxAvatar} from 'react-icons/rx';
import {IoLanguage} from 'react-icons/io5';
import {HiChatBubbleLeft} from 'react-icons/hi2';
import {FiLayout, FiMoreHorizontal} from 'react-icons/fi';
import {TbContrast, TbLayoutSidebarRightCollapse, TbMoonFilled, TbSunFilled} from 'react-icons/tb';

import {Avatar, AvatarImage} from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu';

import {siteConfig, sidebarMoreMenu} from '@/config/site.config';

import SideHistory from '@/components/landing/side/side-history';
import SideAppSettings from '@/components/landing/side/side-app-settings';
import SideUserSettings from '@/components/landing/side/side-user-settings';
import {BsReverseLayoutSidebarReverse} from "react-icons/all";

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

    const isHiddenSide = useAtom(store.isHiddenSideAtom)[0];

    if (isHiddenSide) return null;
    return (
        <aside className={'flex-none h-full flex-col gap-2 flex shadow rounded-lg bg-white/90 md:p-3 '}>
                <div className='flex items-start justify-between border-b'>
                    <div className='p-1 flex-1'>
                        <p className='from-green-400 to-blue-500 bg-gradient-to-r bg-clip-text text-lg font-semibold leading-none text-transparent md:text-xl'>Prompts</p>
                        <p className='text-xs font-medium'>{t(siteConfig.description)}</p>
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
                        onClick={() => (location.href = '')}
                    >
                        <HiChatBubbleLeft/>
                        <span>{t('New Prompt')}</span>
                    </button>
                </div>
                <SideHistory/>
        </aside>
    );
};

export default PromptSide;
