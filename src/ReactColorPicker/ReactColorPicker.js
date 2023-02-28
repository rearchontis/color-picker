'use client';
import React from 'react';
import throttle from 'lodash.throttle';
import './styles.css';
import {Input} from './Input/Input'

/**
 * @param {function} props.onChange - callback which triggers on user input or 'ENTER' keyDown event when any control in in focus
 * @param {{red, green, blue, alpha} | {cyan, magenta, yellow, black} | null} props.initialValue  - value passed to color controls
 * @param {boolean} props.hasTransparency  - enables or disables related to transparency controls
 * @param {string} props.mode  - either 'CMYK' or 'RGB'
 */
export class ReactColorPicker extends React.PureComponent {

    /**
     * @param {{
     *      onChange: Function,
     *      initialValue: {
     *          red: number,
     *          green: number,
     *          blue: number,
     *          alpha: props.hasTransparency extends true ? number : undefined,
     *      } | {
     *          cyan: number,
     *          magenta: number,
     *          yellow: number,
     *          black: number,
     *          alpha: props.hasTransparency extends true ? number : undefined,
     *      } | null,
     *      hasTransparency: boolean,
     *      mode: "CMYK" | "RGB",
     * }} props
     */
    constructor({ onChange, initialValue, hasTransparency, mode }) {
        super();

        this.onChange = onChange;
        this.initialValue = initialValue;
        this.hasTransparency = hasTransparency;
        this.mode = mode;

        this.paletteMarkerRef = React.createRef();
        this.paletteCanvasRef = React.createRef();
        this.rainbowSliderRef = React.createRef();
        this.alphaChannelSliderRef = React.createRef();
        this.alphaChannelSliderGradientRef = React.createRef();

        this.isPaletteMarkerDragged = React.createRef(false);

        let red;
        let green;
        let blue;

        let cyan;
        let magenta;
        let yellow;
        let black;

        if (initialValue && mode === 'CMYK') {
            const rgb = ReactColorPicker.cmyk2rgb(initialValue);

            red = rgb.red;
            green = rgb.green;
            blue = rgb.blue;

            cyan = initialValue.cyan;
            magenta = initialValue.magenta;
            yellow = initialValue.yellow;
            black = initialValue.black;
        }

        if (initialValue && mode === 'RGB') {
            const cmyk = ReactColorPicker.rgb2cmyk(initialValue);

            red = initialValue.red;
            green = initialValue.green;
            blue = initialValue.blue;

            cyan = cmyk.cyan;
            magenta = cmyk.magenta;
            yellow = cmyk.yellow;
            black = cmyk.black;
        }

        const {hue, saturation, value} = ReactColorPicker.rgb2hsv({ red, green, blue });
        const hex = ReactColorPicker.rgb2hex({ red, green, blue, alpha: initialValue.alpha });

        this.state = {
            hex,
            hue,
            saturation,
            value,

            red,
            green,
            blue,
            alpha: hasTransparency ? initialValue.alpha : 1,

            cyan,
            magenta,
            yellow,
            black,
        }
    }

    /**
     *
     */
    componentDidMount() {
        document.addEventListener('mouseup', this.onPalatteMouseUp);
        document.addEventListener('mousemove', this.onPaletteMouseMove);

        this.canvasContext = this.paletteCanvasRef.current.getContext('2d', { willReadFrequently: true });

        this.updatePalette(this.state.hue);
        this.updatePaletteMarkerPosition(this.state.saturation, this.state.value);

        const color = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, 1)`;

        this.paletteMarkerRef.current.style.setProperty('--current-color', color);
        this.alphaChannelSliderRef.current.style.setProperty('--current-color', color);
        this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', color);

        {
            const {red, green, blue} = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 })

            this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${red}, ${green}, ${blue}, 1)`);
        }
    }

    componentDidUpdate() {
        const rgb = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;

        /**
         * @descrition updates marker color on palette
         */
        {
            this.paletteMarkerRef.current.style.setProperty('--current-color', rgb);
        }

        /**
         * @description updates color on alpha channel slider
         */
        {
            this.alphaChannelSliderRef.current.style.setProperty('--current-color', rgb);
            this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', rgb);
        }

        /**
         * @description updates rainbow slider preview color
         */
        {
            const {red, green, blue} = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 });

            this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${red}, ${green}, ${blue}, 1)`);
        }

        const preview = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, ${this.state.alpha})`;

        /**
         * @description calls callback passed from parent component with updated state
         */
        this.onChange(this.state);
    }

    /**
     *
     */
    componentWillUnmount() {
        document.removeEventListener('mouseup', this.onPalatteMouseUp);
        document.removeEventListener('mousemove', this.onPaletteMouseMove);
    }

    /**
     *
     * @returns {{
     *      red: number,
     *      green: number,
     *      blue: number,
     * }} RGB in numbers from 0 to 255
     */
    extractColorByPaletteMarkerPosition = () => {
        let x = Number(this.paletteMarkerRef.current.style.left.replace('px', '')) + 10;
        let y = Number(this.paletteMarkerRef.current.style.top.replace('px', '')) + 10;

        if (x === this.canvasContext.canvas.width) {
            x -= 1;
        }

        if (y === this.canvasContext.canvas.height) {
            y -= 1;
        }

        const {data} = this.canvasContext.getImageData(x, y, 1, 1);
        const [red, green, blue] = data;

        return {red, green, blue};
    }

    /**
     *
     * @param {number} hue
     */
    updatePalette = (hue) => {
        this.canvasContext.clearRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height);

        const {red, green, blue} = ReactColorPicker.hsl2rgb({ hue, saturation: 100, lightness: 50 });
        const gradientH = this.canvasContext.createLinearGradient(1, 1, this.canvasContext.canvas.width - 1, 1);
        gradientH.addColorStop(0, 'rgba(255,255,255,1)');
        gradientH.addColorStop(1, `rgba(${red},${green},${blue},1)`);

        this.canvasContext.fillStyle = gradientH;
        this.canvasContext.fillRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height);

        const gradientV = this.canvasContext.createLinearGradient(1, 1, 1, this.canvasContext.canvas.height - 1);
        gradientV.addColorStop(0, 'rgba(0,0,0,0)');
        gradientV.addColorStop(1, 'rgba(0,0,0,1)');

        this.canvasContext.fillStyle = gradientV;
        this.canvasContext.fillRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height);
    }

    /**
     *
     * @description updates marker position on palette
     * this method must be called on inputs changes only
     * @param {number} saturation
     * @param {number} value
     */
    updatePaletteMarkerPosition = (saturation, value) => {
        const {height, width} = this.canvasContext.canvas;
        const offsetLeft = ((Number(saturation) * width / 100) | 0) - 10;
        const offsetTop = (height - (Number(value) * height / 100) | 0) - 10;

        this.paletteMarkerRef.current.style.top = `${offsetTop}px`;
        this.paletteMarkerRef.current.style.left = `${offsetLeft}px`;
    }

    /**
     *
     * @param {{
     *      cyan: number,
     *      magenta: number,
     *      yellow: number,
     *      black: number,
     * }} CMYK in percents from 0 to 100
     * @returns {{
     *      red: number,
     *      green: number,
     *      blue: number,
     * }} RGB in numbers from 0 to 255
     */
    static cmyk2rgb = ({ cyan, magenta, yellow, black }) => {
        const key = 1 - black / 100;

        return {
            red: Math.round((255 * (1 - cyan / 100) * key)),
            green: Math.round((255 * (1 - magenta / 100) * key)),
            blue: Math.round((255 * (1 - yellow / 100) * key)),
        };
    }

    /**
     *
     * @param {{
     *      red: number,
     *      green: number,
     *      blue: number,
     * }} color RGB numbers from 0 to 255
     * @returns {{
     *      cyan: number,
     *      magenta: number,
     *      yellow: number,
     *      black: number,
     * }} CMYK percents from 0 to 100
     */
    static rgb2cmyk = ({ red, green, blue }) => {
        const redCMYK = red / 255;
        const greenCMYK = green / 255;
        const blueCMYK = blue / 255;

        const black = 1 - Math.max(redCMYK, greenCMYK, blueCMYK);
        const key = 1 - black;

        const cyan = (1 - redCMYK - black) / key;
        const magenta = (1 - greenCMYK - black) / key;
        const yellow = (1 - blueCMYK - black) / key;

        return {
            cyan: Math.round(cyan * 100) | 0,
            magenta: Math.round(magenta * 100) | 0,
            yellow: Math.round(yellow * 100) | 0,
            black: Math.round(black * 100) | 0,
        };
    }

    /**
     *
     * @param {number} hue degrees from 0 to 360
     * @param {number} saturation percents from 0% to 100%
     * @param {number} lightness percents from 0% to 100%
     * @returns {{ red, green, blue }}
     */
    static hsl2rgb = ({ hue, saturation, lightness }) => {
        const k = (n) => (n + hue / 30) % 12;
        const a = saturation / 100 * Math.min(lightness / 100, 1 - lightness / 100);

        const f = (n) => {
            return lightness / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        }

        return {
            red: 255 * f(0),
            green: 255 * f(8),
            blue: 255 * f(4),
        };
    }

    /**
     *
     * @param {{
     *      red: number,
     *      green: number,
     *      blue: number,
     *      alpha?: number,
     * }} rgba
     * @returns {string} hex
     */
    static rgb2hex = (rgba) => {
        const pad = (n) => n.toString(16).padStart(2, '0');

        return `#${Object.values(rgba).map(pad).join('')}`;
    }

    /**
     *
     * @param {string} hex
     * @returns {{
     *      red: number,
     *      green: number,
     *      blue: number,
     *      alpha?: number,
     * }}
     */
    static hex2rgb = (hex) => {
        const halfHexFormatRegExp = /([0-9A-F])([0-9A-F])([0-9A-F])/i;
        const longHexFormatRegExp = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)|(^#{0,1}[0-9A-F]{8}$)/i;

        if (longHexFormatRegExp.test(hex)) {
            if (hex[0] === '#') {
                hex = hex.slice(1, hex.length);
            }

            if (hex.length === 3) {
                hex = hex.replace(halfHexFormatRegExp, '$1$1$2$2$3$3');
            }

            const rh = hex.slice(0, 2);
            const gh = hex.slice(2, 4);
            const bh = hex.slice(4, 6);
            const ah = hex.slice(6, 8);

            const result = {
                red: parseInt(rh, 16) | 0,
                green: parseInt(gh, 16) | 0,
                blue: parseInt(bh, 16) | 0,
                alpha: parseInt(ah, 16) / 255 | 0,
            };

            return result;
        }
    }

    /**
     *
     * @param {{ red, green, blue }} color
     * @returns {{ hue, saturation, value }} hsv
     */
    static rgb2hsv = ({ red, green, blue }) => {
        const normalizedRed = red / 255;
        const normalizedGreen = green / 255;
        const normalizedBlue = blue / 255;
        const normalizedMinValue = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
        const normalizedMaxValue = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
        const normalizedDiff = normalizedMaxValue - normalizedMinValue;

        if (normalizedDiff === 0) {
            return {
                hue: Math.round(0 * 360),
                saturation: Math.round(0 * 100),
                value: Math.round(normalizedMaxValue * 100),
            };
        }

        const normalizedSaturation = normalizedDiff / normalizedMaxValue;
        const redHue = (normalizedMaxValue - normalizedRed) / 6 / normalizedDiff + 1 / 2;
        const greenHue = (normalizedMaxValue - normalizedGreen) / 6 / normalizedDiff + 1 / 2;
        const blueHue = (normalizedMaxValue - normalizedBlue) / 6 / normalizedDiff + 1 / 2;

        let normalizedHue;

        if (normalizedRed === normalizedMaxValue) {
            normalizedHue = blueHue - greenHue;
        } else if (normalizedGreen === normalizedMaxValue) {
            normalizedHue = (1 / 3) + redHue - blueHue;
        } else if (normalizedBlue === normalizedMaxValue) {
            normalizedHue = (2 / 3) + greenHue - redHue;
        }

        if (normalizedHue < 0) {
            normalizedHue += 1;
        } else if (normalizedHue > 1) {
            normalizedHue -= 1;
        }

        return {
            hue: Math.round(normalizedHue * 360),
            saturation: Math.round(normalizedSaturation * 100),
            value: Math.round(normalizedMaxValue * 100),
        };
    }

    /**
     *
     * @param {React.MouseEvent<HTMLCanvasElement>} event
     */
    onPaletteMarkerMove = throttle((event) => {
        const {left, top} = this.paletteCanvasRef.current.getBoundingClientRect();
        const markerSize = 10;

        let markerPositionY = event.clientY - top - markerSize;
        let markerPositionX = event.clientX - left - markerSize;

        if (markerPositionY < -markerSize) {
            markerPositionY = -markerSize;
        }

        if (markerPositionY > this.canvasContext.canvas.height - markerSize) {
            markerPositionY = this.canvasContext.canvas.height - markerSize;
        }

        if (markerPositionX < -markerSize) {
            markerPositionX = -markerSize;
        }

        if (markerPositionX > this.canvasContext.canvas.width - markerSize) {
            markerPositionX = this.canvasContext.canvas.width - markerSize;
        }

        this.paletteMarkerRef.current.style.top = `${markerPositionY}px`;
        this.paletteMarkerRef.current.style.left = `${markerPositionX}px`;

        const {red, green, blue} = this.extractColorByPaletteMarkerPosition();
        const {cyan, magenta, yellow, black} = ReactColorPicker.rgb2cmyk({ red, green, blue });
        const hex = ReactColorPicker.rgb2hex({ red, green, blue, alpha: this.state.alpha });
        const color =`rgba(${red}, ${green}, ${blue}, 1)`;

        this.paletteMarkerRef.current.style.setProperty('--current-color', color);
        this.alphaChannelSliderRef.current.style.setProperty('--current-color', color);
        this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', color);

        this.setState({
            ...this.state,
            red,
            green,
            blue,
            hex,
            cyan,
            magenta,
            yellow,
            black,
        });
    }, 10)

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onColorSliderChange = throttle((event) => {
        const hue = parseInt(event.target.value);

        this.updatePalette(hue);

        const rgb = this.extractColorByPaletteMarkerPosition();
        const cmyk = ReactColorPicker.rgb2cmyk(rgb);

        this.setState({
            ...this.state,
            ...rgb,
            ...cmyk,
            hue,
        });
    }, 15)

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onHexInputChange = ({ target }) => {
        const hex = target.value;
        const validHexSymbolsRegExp = /#[0-9A-F]+/gi;

        if (hex.length <= 9 && hex.match(validHexSymbolsRegExp)) {
            if (hex.length === 4 || hex.length === 7 || hex.length === 9) {
                const rgb = ReactColorPicker.hex2rgb(hex);
                const hsv = ReactColorPicker.rgb2hsv(rgb);
                const cmyk = ReactColorPicker.rgb2cmyk(rgb);

                this.updatePalette(hsv.hue);
                this.updatePaletteMarkerPosition(hsv.saturation, hsv.value);

                this.setState({
                    ...this.state,
                    ...cmyk,
                    ...rgb,
                    ...hsv,
                    hex,
                });
            } else {
                this.setState({ ...this.state, hex });
            }
        }
    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onRgbInputChange = ({ target }) => {
        const numbers = /^[0-9]+$/;
        const maxValue = 255;

        if (target.value.match(numbers) || target.value === '') {
            let targetValue = Number(target.value);

            if (targetValue > maxValue) {
                targetValue = maxValue;
            }

            const rgb = {
                red: this.state.red,
                green: this.state.green,
                blue: this.state.blue,
                [target.name]: targetValue,
            };
            const cmyk = ReactColorPicker.rgb2cmyk(rgb);
            const hsv = ReactColorPicker.rgb2hsv(rgb);
            const hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });

            this.updatePalette(hsv.hue);
            this.updatePaletteMarkerPosition(hsv.saturation, hsv.value);

            this.setState({
                ...this.state,
                ...cmyk,
                ...rgb,
                ...hsv,
                hex,
            });
        }

    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onCmykInputChange = ({ target }) => {
        const numbers = /^[0-9]+$/;
        const maxValue = 100;

        if (target.value.match(numbers) || target.value === '') {
            let targetValue = Number(target.value);

            if (targetValue > maxValue) {
                targetValue = maxValue;
            }

            const cmyk = {
                cyan: this.state.cyan,
                magenta: this.state.magenta,
                yellow: this.state.yellow,
                black: this.state.black,
                [target.name]: targetValue,
            };
            const rgb = ReactColorPicker.cmyk2rgb(cmyk);
            const hsv = ReactColorPicker.rgb2hsv(rgb);
            const hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });

            this.updatePalette(hsv.hue);
            this.updatePaletteMarkerPosition(hsv.saturation, hsv.value);

            this.setState({
                ...this.state,
                ...cmyk,
                ...rgb,
                ...hsv,
                hex,
            });
        }
    }

    /**
     *
     * @param {React.MouseEvent<HTMLDivElement, MouseEvent>} event
     */
    onPaletteMouseDown = (event) => {
        this.isPaletteMarkerDragged.current = true;
    }

    /**
     *
     * @param {React.MouseEvent<HTMLDivElement, MouseEvent>} event
     */
    onPaletteMouseMove = throttle((event) => {
        if (this.isPaletteMarkerDragged.current) {
            this.onPaletteMarkerMove(event);
        }
    }, 10)

    /**
     *
     * @param {React.MouseEvent<HTMLDivElement, MouseEvent>} event
     */
    onPalatteMouseUp = (event) => {
        this.isPaletteMarkerDragged.current = false;
    }

    /**
     *
     * @todo add 'Enter' keydown handler
     * @returns {JSX.Element}
     */
    render() {
        // className="react-color-picker__container"
        // console.log(this.state);
        return (
            <div className='container'>
                <div className='palette__container'>
                    <canvas
                        width="280"
                        height="280"
                        ref={this.paletteCanvasRef}
                        className='palette__canvas'
                        onClick={this.onPaletteMarkerMove}
                        onMouseUp={this.onPalatteMouseUp}
                        onMouseDown={this.onPaletteMouseDown}
                    />
                    <div
                        ref={this.paletteMarkerRef}
                        className="palette__marker"
                        onMouseDown={this.onPaletteMouseDown}
                        onMouseMove={this.onPaletteMouseMove}
                        onMouseUp={this.onPalatteMouseUp}
                    />
                </div>
                <div className='slider__container'>
                    <div className='slider__gradient' />
                    <input
                        ref={this.rainbowSliderRef}
                        className='slider__control'
                        type="range"
                        value={this.state.hue}
                        step={1}
                        min="0"
                        max="360"
                        onChange={this.onColorSliderChange}
                    />
                </div>
                <div className="slider__container">
                    <div className="slider__background slider__alpha" />
                    <div className="slider__gradient slider__alpha" ref={this.alphaChannelSliderGradientRef} />
                    <input
                        ref={this.alphaChannelSliderRef}
                        className="slider__control"
                        type="range"
                        step={1}
                        min="0"
                        max="100"
                        defaultValue="100"
                    />
                </div>
                <div className='input-group'>
                    <Input value={this.state.hex} name="hex" classes="hex" label="HEX" onChange={this.onHexInputChange} />
                    {/* <Input value={this.state.red} name="red" classes="rgb" label="R" onChange={this.onRgbInputChange} /> */}
                    {/* <Input value={this.state.green} name="green" classes="rgb" label="G" onChange={this.onRgbInputChange} /> */}
                    {/* <Input value={this.state.blue} name="red" classes="rgb" label="B" onChange={this.onRgbInputChange} /> */}
                    <Input value={this.state.cyan} name="cyan" classes="cmyk" label="C" onChange={this.onCmykInputChange} />
                    <Input value={this.state.magenta} name="magenta" classes="cmyk" label="M" onChange={this.onCmykInputChange} />
                    <Input value={this.state.yellow} name="yellow" classes="cmyk" label="Y" onChange={this.onCmykInputChange} />
                    <Input value={this.state.black} name="black" classes="cmyk" label="K" onChange={this.onCmykInputChange} />
                </div>
                {/* <div className="cmyk-input__container">
                    <input name='cyan' className="cyan-input__control" step={1} type="text" pattern="[0-9]" maxLength={3} value={this.state.cyan} onChange={this.onCmykInputChange} />
                    <label>C</label>
                    <input name='magenta' className="cyan-input__control" step={1} type="text" pattern="[0-9]" maxLength={3} value={this.state.magenta} onChange={this.onCmykInputChange} />
                    <label>M</label>
                    <input name='yellow' className="cyan-input__control" step={1} type="text" pattern="[0-9]" maxLength={3} value={this.state.yellow} onChange={this.onCmykInputChange} />
                    <label>Y</label>
                    <input name='black' className="cyan-input__control" step={1} type="text" pattern="[0-9]" maxLength={3} value={this.state.black} onChange={this.onCmykInputChange} />
                    <label>K</label>
                </div> */}
            </div>
        )
    }
}