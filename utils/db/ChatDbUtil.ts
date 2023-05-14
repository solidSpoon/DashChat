import {chatDb} from "@/utils/db/db";
import {v4 as uuid} from "uuid";
import moment from "moment";

export class ChatDbUtil {

        public static enableCloudSync = true;

        public static readonly REMOTE_KEY = 'chat-conversations-remote';
        public static readonly LOCAL_KEY = 'chat-conversations-local';
        private static readonly APT_PATH = '/api/nuser/chat';

}