import styles from './ColorInputRGB.module.css';

interface IColorInputRGBProps {
    color: {
        red: number;
        green: number;
        blue: number;
    };
}

export function ColorInputRGB({color}: IColorInputRGBProps) {
    const {red, green, blue} = color;

    return (
        <div className={styles.container}>
            <input className={styles.input} type="number" min={0} max={255} maxLength={3} value={red} />
            <label>R</label>
            <input className={styles.input} type="number" min={0} max={255} maxLength={3} value={green} />
            <label>G</label>
            <input className={styles.input} type="number" min={0} max={255} maxLength={3} value={blue} />
            <label>B</label>
        </div>
    );
}