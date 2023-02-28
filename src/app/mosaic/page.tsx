'use client';
import { ReactColorPicker } from "@/ReactColorPicker/ReactColorPicker";

export default function Page() {
    return (
        <>
            <ReactColorPicker
                onChange={() => { /*console.dir*/ }}
                initialValue={{red: 255, green: 0, blue: 0}}
                // initialValue={{cyan: 0, magenta: 100, yellow: 100, black: 0, alpha: 100}}
                hasTransparency={false}
                mode="RGB"
            />
        </>
    );
}