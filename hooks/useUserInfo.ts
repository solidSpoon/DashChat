import useSWR from 'swr';
import {User} from "@prisma/client";

export interface UserInfoProps {
    userInfo: User | undefined;
    isLoading: boolean;
    error:Error | undefined;
}

const useUserInfo = (): UserInfoProps => {
    const {data, isLoading, error} = useSWR<{ user: User }>('/api/user/info', async (url) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return {user: undefined};
        }

        const data = await response.json();

        if (!data.user) {
            return {user: undefined};
        }

        return data;
    });

    return {
        userInfo: data?.user,
        isLoading: isLoading,
        error: error,
    };
};

export default useUserInfo;