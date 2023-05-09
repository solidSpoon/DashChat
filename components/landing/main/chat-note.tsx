import {useEffect, useRef, useState} from "react";
import {usePrevious} from "@radix-ui/react-use-previous";

const ChatNote = () => {
    const noteKey = "chatNote";
    const [note,setNote] = useState<string>(localStorage.getItem(noteKey) ?? "");
    useEffect(() => {
        localStorage.setItem(noteKey, note);
    }, [note]);

    return (
        <textarea
            className="h-full w-full resize-none focus:outline-none text-gray-500 p-2"
            onChange={(e) => setNote(e.target.value)}
            value={note}
        />
    )
}
export default ChatNote;