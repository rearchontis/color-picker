'use client';
import { useRef, useState } from 'react';
import styles from './ColorSlider.module.css';

interface IColorSliderProps {
    value: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export function ColorSlider({value, onChange}: IColorSliderProps) {
    const sliderRef = useRef<HTMLInputElement>(null);

    return (
        <div className={styles.container}>
            <div className={styles.gradient} />
            <input
                ref={sliderRef}
                className={styles.slider}
                type="range"
                value={value}
                min="0"
                max="360"
                onChange={onChange}
            />
        </div>
    );
}