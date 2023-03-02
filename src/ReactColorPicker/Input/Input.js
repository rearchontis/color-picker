import './styles.css';

export function Input({ value, label, name, onChange, className }) {
    return (
        <div className={`react-color-picker__input-group input-field ${className}`}>
            <div className="react-color-picker__input-group input-field input-container">
                <input
                    className="react-color-picker__input-group text-input"
                    value={value}
                    onChange={onChange}
                    name={name}
                    type="text"
                    maxLength={name === 'hex' ? 9 : 3}
                />
            </div>
            <div className="react-color-picker__input-group input-field label">
                {label}
            </div>
        </div>
    );
}