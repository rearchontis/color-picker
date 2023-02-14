'use client';
import { useState } from 'react';
import { ColorSlider } from './ColorSlider/ColorSlider';
import { ColorPalette } from './ColorPalette/ColorPalette';
import { ColorInputCMYK } from './ColorInputCMYK/ColorInputCMYK';
import { ColorInputHEX } from './ColorInputHEX/ColorInputHEX';
import { ColorInputRGB } from './ColorInputRGB/ColorInputRGB';
import styles from './ReactColorPicker.module.css';

function hsl2rgb({ hue, saturation, lightness }: Record<string, number>) {
    saturation /= 100;
    lightness /= 100;
    const k = (n: number) => (n + hue / 30) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);

    const f = (n: number) => {
        return lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    }

    return { red: 255 * f(0), green: 255 * f(8), blue: 255 * f(4) } ;
}

export function ReactColorPicker() {
    const [hue, setHue] = useState(0);
    const [color, setColor] = useState({red: 255, green: 0, blue: 0});

    const onChangeColorSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
        setHue(parseInt(event.target.value));
        setColor(hsl2rgb({ hue, saturation: 100, lightness: 50 }));
    }

    const onChangeColorInputHEX = (event: React.ChangeEvent<HTMLInputElement>) => {
        const hex = event.target.value;

        setColor(hex2rgb(hex));
    }

    console.log("ReactColorPicker", color)

    return (
        <div className={styles.container}>
            <ColorPalette hue={hue} setColor={setColor} />
            <ColorSlider value={hue} onChange={onChangeColorSlider} />
            <ColorInputHEX color={color} onChange={onChangeColorInputHEX} />
            <ColorInputRGB color={color} />
            <ColorInputCMYK color={color} setColor={setColor} />
        </div>
    );
}