'use client';
import { useRef, useState } from 'react';
import styles from './ColorSlider.module.css';

interface IColorSliderProps {
    value: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export function ColorSlider({value, onChange}: IColorSliderProps) {
    const sliderRef = useRef<HTMLInputElement>(null);

    // sliderRef.current.style.left = `${hue}px`; -> slider
    // sliderRef.current.style.left = `${hue / 360 * context.canvas.width}px;

    // console.log("ColorSlider", value);

    return (
        <div className={styles.container}>
            <div className={styles.gradient} />
            <input
                ref={sliderRef}
                className={styles.slider}
                type="range"
                value={value}
                step={1}
                min="0"
                max="360"
                onChange={onChange}
            />
        </div>
    );
}