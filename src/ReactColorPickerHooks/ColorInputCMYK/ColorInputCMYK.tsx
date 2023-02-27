import { type Dispatch, type SetStateAction } from 'react';
import styles from './ColorInputCMYK.module.css';

function cmyk2rgb({ cyan, magenta, yellow, black }: Record<string, number>) {
    const key = 1 - black / 100;

    return {
        red: Math.round((255 * (1 - cyan / 100) * key) / 100),
        green: Math.round((255 * (1 - magenta / 100) * key) / 100),
        blue: Math.round((255 * (1 - yellow / 100) * key) / 100),
    }
}

function rgb2cmyk({ red, green, blue }: Record<string, number>) {
    const redCMYK = red / 255;
    const greenCMYK = green / 255;
    const blueCMYK = blue / 255;

    const black = 1 - Math.max(redCMYK, greenCMYK, blueCMYK);
    const key = 1 - black;

    const cyan = (1 - redCMYK - black) / key;
    const magenta = (1 - greenCMYK - black) / key;
    const yellow = (1 - blueCMYK - black) / key;

    return {
        cyan: Math.round(cyan * 100),
        magenta: Math.round(magenta * 100),
        yellow: Math.round(yellow * 100),
        black: Math.round(black * 100),
    }
}

interface IColorInputCMYKProps {
    color: {
        red: number;
        green: number;
        blue: number;
    };
    setColor: Dispatch<SetStateAction<{
        red: number;
        green: number;
        blue: number;
    }>>;
}

export function ColorInputCMYK({ color, setColor }: IColorInputCMYKProps) {
    const { cyan, magenta, yellow, black } = rgb2cmyk(color);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        setColor(cmyk2rgb({ cyan, magenta, yellow, black, [name]: +value }))
    }

    return (
        <div className={styles.container}>
            <input name='cyan' className={styles.input} step={1} type="number" min={0} max={100} maxLength={3} value={cyan} onChange={onChange} />
            <label>C</label>
            <input name='magenta' className={styles.input} step={1} type="number" min={0} max={100} maxLength={3} value={magenta} onChange={onChange} />
            <label>M</label>
            <input name='yellow' className={styles.input} step={1} type="number" min={0} max={100} maxLength={3} value={yellow} onChange={onChange} />
            <label>Y</label>
            <input name='black' className={styles.input} step={1} type="number" min={0} max={100} maxLength={3} value={black} onChange={onChange} />
            <label>K</label>
        </div>
    );
}