import {useEffect, useState, type Dispatch, type SetStateAction} from 'react';
import styles from './ColorInputRGB.module.css';

interface IColorInputRGBProps {
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

export function ColorInputRGB({color, setColor}: IColorInputRGBProps) {
    const [state, setState] = useState(color);
    const {red, green, blue} = state;

    useEffect(() => {
        setState(color);
    }, [color]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = event.target;

        setColor({ red, green, blue, [name]: value});
        setState({ red, green, blue, [name]: value});
    };

    return (
        <div className={styles.container}>
            <input className={styles.input} name="red" type="number" step={1} min={0} max={255} maxLength={3} value={red} onChange={onChange} />
            <label>R</label>
            <input className={styles.input} name="green" type="number" step={1} min={0} max={255} maxLength={3} value={green} onChange={onChange} />
            <label>G</label>
            <input className={styles.input} name="blue" type="number" step={1} min={0} max={255} maxLength={3} value={blue} onChange={onChange} />
            <label>B</label>
        </div>
    );
}