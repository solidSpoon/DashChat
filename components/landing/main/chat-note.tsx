import {useEffect, useState} from "react";

const ChatNote = () => {
    const noteKey = "chatNote";
    const [note,setNote] = useState<string>("");
    useEffect(() => {
        localStorage.setItem(noteKey, note);
    }, [note]);
    useEffect(() =>{
        setNote(localStorage.getItem(noteKey)??'');
    },[])

    return (
        <textarea
            className="h-full w-full resize-none focus:outline-none text-gray-500 p-2"
            onChange={(e) => setNote(e.target.value)}
            value={note}
        />
    )
}
export default ChatNote;