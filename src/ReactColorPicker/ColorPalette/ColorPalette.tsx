'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import styles from './ColorPalette.module.css';

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

interface IColorPaletteProps {
    hue: number;
    setColor: Dispatch<SetStateAction<{
        red: number;
        green: number;
        blue: number;
    }>>;
}

export function ColorPalette({ hue, setColor }: IColorPaletteProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const color = hsl2rgb({ hue, saturation: 100, lightness: 50 });

        const gradientH = context.createLinearGradient(0, 0, context.canvas.width, 0);
        gradientH.addColorStop(0, 'rgba(255,255,255,1)');
        gradientH.addColorStop(1, `rgba(${color.red},${color.green},${color.blue},1)`);

        context.fillStyle = gradientH;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        const gradientV = context.createLinearGradient(0, 0, 0, context.canvas.height);
        gradientV.addColorStop(0, 'rgba(0,0,0,0)');
        gradientV.addColorStop(1, 'rgba(0,0,0,1)');

        context.fillStyle = gradientV;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }, [hue]);

    const onClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // @see https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently
        const context = canvas.getContext('2d'); // willReadFrequently
        if (!context) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const imageData = context.getImageData(x, y, 1, 1);
        const data = imageData.data;
        // const rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;

        setColor({red: data[0], green: data[1], blue: data[2]})
    }, [setColor]);

    return (
        <canvas
            width="300px"
            height="300px"
            ref={canvasRef}
            className={styles.palette}
            onClick={onClick}
        />
    );
}