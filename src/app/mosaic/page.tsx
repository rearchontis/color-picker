'use client';
import { ReactColorPicker } from "@/ReactColorPicker/ReactColorPicker";

export default function Page() {
    return (
        <>
            <ReactColorPicker
                onChange={console.log}
                initialValue={{cyan: 0, magenta: 100, yellow: 100, black: 0, alpha: 100}}
                hasTransparency={true}
                mode="CMYK"
            />
        </>
    );
}