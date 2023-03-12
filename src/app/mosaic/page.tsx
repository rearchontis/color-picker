'use client';
import { ReactColorPicker } from "@/ReactColorPicker/ReactColorPicker";

export default function Page() {
    return (
        <>
            <ReactColorPicker
                onChange={() => {}}
                onInputEnterPress={() => {}}
                initialValue={{red: 255, green: 0, blue: 0, alpha: 75}}
                hasTransparency={true}
                mode="CMYK"
            />
        </>
    );
}