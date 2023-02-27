'use client';
import { useRef, useState } from 'react';
import styles from './AlphaChannelSlider.module.css';

export function AlphaChannelSlider() {
    const sliderRef = useRef<HTMLInputElement>(null);

    // sliderRef.current.style.left = `${hue}px`; -> slider
    // sliderRef.current.style.left = `${hue / 360 * context.canvas.width}px;

    return (
        <div className={styles.container}>
            <div className={styles.alpha} />
            <div className={styles.gradient} />
            <input
                ref={sliderRef}
                className={styles.slider}
                type="range"
                step={1}
                min="0"
                max="100"
                defaultValue="100"
            />
        </div>
    );
}