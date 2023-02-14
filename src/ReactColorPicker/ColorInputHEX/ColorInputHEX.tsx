import {useState, type Dispatch, type SetStateAction} from 'react';
import styles from './ColorInputHEX.module.css';

function rgb2hex({ red, green, blue }: Record<string, number>) {
    return `#${red.toString(16)}${green.toString(16)}${blue.toString(16)}`
}

function hex2rgb(hex: string) {
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);

    return {
        red,
        green,
        blue,
    }
}

interface IColorInputHEXProps {
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

export function ColorInputHEX({ color, setColor }: IColorInputHEXProps) {
    const [state, setState] = useState(rgb2hex(color));

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const hex = event.target.value;

        setState(hex);

        if (hex.length === 7) {
            setColor(hex2rgb(hex));
        }
    }

    return (
        <div className={styles.container}>
            <input className={styles.input} type="text" value={state} onChange={onChange} />
            <label>HEX</label>
        </div>
    );
}