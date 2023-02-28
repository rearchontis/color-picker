import './styles.css';

export function Input({ value, label, name, onChange, classes }) {
    return (
        <div className={`input-field ${classes}`}>
            <div className="input-field input-container">
                <input
                    className="text-input"
                    value={value}
                    onChange={onChange}
                    name={name}
                    type="text"
                    maxLength={3}
                />
            </div>
            <div className="input-field label">
                {label}
            </div>
        </div>
    );
}