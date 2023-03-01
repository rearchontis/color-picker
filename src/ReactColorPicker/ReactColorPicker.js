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

        this.previewRef = React.createRef();
        this.paletteMarkerRef = React.createRef();
        this.paletteCanvasRef = React.createRef();
        this.rainbowSliderRef = React.createRef();
        this.alphaChannelSliderMarkerRef = React.createRef();

        this.isPaletteMarkerDragged = React.createRef(false);

        let red = initialValue.red;
        let green = initialValue.green;
        let blue = initialValue.blue;
        let {cyan, magenta, yellow, black} = ReactColorPicker.rgb2cmyk(initialValue);

        let {hue, saturation, value} = ReactColorPicker.rgb2hsv({ red, green, blue });
        let rgb = { red, green, blue };

        if (hasTransparency) {
            rgb.alpha = initialValue.alpha;

            this.alphaChannelSliderRef = React.createRef();
            this.alphaChannelSliderGradientRef = React.createRef();
        }

        let hex = ReactColorPicker.rgb2hex(rgb);

        this.state = {
            hex,
            hue,
            saturation,
            value,

            red,
            green,
            blue,
            alpha: hasTransparency ? initialValue.alpha : 100,

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
        let color, preview, rgb;

        document.addEventListener('mouseup', this.onPalatteMouseUp);
        document.addEventListener('mousemove', this.onPaletteMouseMove);

        // this.paletteCanvasRef.current.addEventListener('mouseup', this.onPalatteMouseUp);
        // this.paletteCanvasRef.current.addEventListener('mousemove', this.onPaletteMouseMove);

        this.canvasContext = this.paletteCanvasRef.current.getContext('2d', { willReadFrequently: true });

        this.updatePalette(this.state.hue);
        this.updatePaletteMarkerPosition(this.state.saturation, this.state.value);

        rgb = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 });
        this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 1)`);

        color = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, 1)`;
        this.paletteMarkerRef.current.style.setProperty('--current-color', color);

        if (this.hasTransparency) {
            let gradient = `linear-gradient(to right, rgba(0, 0, 0, 0), rgb(${this.state.red}, ${this.state.green}, ${this.state.blue}))`;
            preview = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, ${this.state.alpha / 100})`;

            this.previewRef.current.style.setProperty('--current-color', preview);
            this.alphaChannelSliderRef.current.style.setProperty('--current-color', preview);
            this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', preview);

            const width = 190
            const offsetLeft = ((this.state.alpha / 100 * width) | 0) - 10;

            // const pointerStyle = {
            //     left: `${offsetLeft}px`,
            // };
            // this.alphaChannelSliderMarkerRef.current.style.height = '10px'
            // this.alphaChannelSliderMarkerRef.current.style.width = '10px'

            // this.alphaChannelSliderMarkerRef.current.style.left = `${offsetLeft}px`
        } else {
            preview = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
            this.previewRef.current.style.setProperty('--current-color', preview);
        }


    }

    componentDidUpdate() {
        let color, preview, rgb;

        rgb = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 });
        this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 1)`);

        color = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
        this.paletteMarkerRef.current.style.setProperty('--current-color', color);

        if (this.hasTransparency) {
            preview = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, ${this.state.alpha / 100})`;

            this.previewRef.current.style.setProperty('--current-color', preview);
            this.alphaChannelSliderRef.current.style.setProperty('--current-color', preview);
            this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', color);
        } else {
            preview = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
            this.previewRef.current.style.setProperty('--current-color', preview);
        }

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

        let {data} = this.canvasContext.getImageData(x, y, 1, 1);
        let [red, green, blue] = data;

        return {red, green, blue};
    }

    /**
     *
     * @param {number} hue
     */
    updatePalette = (hue) => {
        this.canvasContext.clearRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height);

        let {red, green, blue} = ReactColorPicker.hsl2rgb({ hue, saturation: 100, lightness: 50 });
        let gradientH = this.canvasContext.createLinearGradient(1, 1, this.canvasContext.canvas.width - 1, 1);
        gradientH.addColorStop(0, 'rgba(255,255,255,1)');
        gradientH.addColorStop(1, `rgba(${red},${green},${blue},1)`);

        this.canvasContext.fillStyle = gradientH;
        this.canvasContext.fillRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height - 1);

        let gradientV = this.canvasContext.createLinearGradient(1, 1, 1, this.canvasContext.canvas.height - 1);
        gradientV.addColorStop(0, 'rgba(0,0,0,0)');
        gradientV.addColorStop(1, 'rgba(0,0,0,1)');

        this.canvasContext.fillStyle = gradientV;
        this.canvasContext.fillRect(0, 0, this.canvasContext.canvas.width, this.canvasContext.canvas.height - 1);
    }

    /**
     *
     * @description updates marker position on palette
     * this method must be called on inputs changes only
     * @param {number} saturation
     * @param {number} value
     */
    updatePaletteMarkerPosition = (saturation, value) => {
        let height, width, offsetLeft, offsetTop;

        height = this.canvasContext.canvas.height;
        width = this.canvasContext.canvas.width;
        offsetLeft = ((Number(saturation) * width / 100) | 0) - 10;
        offsetTop = (height - (Number(value) * height / 100) | 0) - 10;

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
        let key = 1 - black / 100;

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
        let normalizedRed, normalizedGreen, normalizedBlue, cyan, magenta, yellow, black, key;

        normalizedRed = red / 255;
        normalizedGreen = green / 255;
        normalizedBlue = blue / 255;

        black = 1 - Math.max(normalizedRed, normalizedGreen, normalizedBlue);
        key = 1 - black;

        cyan = (1 - normalizedRed - black) / key;
        magenta = (1 - normalizedGreen - black) / key;
        yellow = (1 - normalizedBlue - black) / key;

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
        let k = (n) => (n + hue / 30) % 12;
        let a = saturation / 100 * Math.min(lightness / 100, 1 - lightness / 100);

        let f = (n) => {
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
        let pad = (n) => n.toString(16).padStart(2, '0');

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
        let halfHexFormatRegExp = /([0-9A-F])([0-9A-F])([0-9A-F])/i;
        let longHexFormatRegExp = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)|(^#{0,1}[0-9A-F]{8}$)/i;

        if (longHexFormatRegExp.test(hex)) {
            if (hex[0] === '#') {
                hex = hex.slice(1, hex.length);
            }

            if (hex.length === 3) {
                hex = hex.replace(halfHexFormatRegExp, '$1$1$2$2$3$3');
            }

            let rh = hex.slice(0, 2);
            let gh = hex.slice(2, 4);
            let bh = hex.slice(4, 6);
            let ah = hex.slice(6, 8);

            let result = {
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
        let normalizedRed = red / 255;
        let normalizedGreen = green / 255;
        let normalizedBlue = blue / 255;
        let normalizedMinValue = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
        let normalizedMaxValue = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
        let normalizedDiff = normalizedMaxValue - normalizedMinValue;

        if (normalizedDiff === 0) {
            return {
                hue: Math.round(0 * 360),
                saturation: Math.round(0 * 100),
                value: Math.round(normalizedMaxValue * 100),
            };
        }

        let normalizedSaturation = normalizedDiff / normalizedMaxValue;
        let redHue = (normalizedMaxValue - normalizedRed) / 6 / normalizedDiff + 1 / 2;
        let greenHue = (normalizedMaxValue - normalizedGreen) / 6 / normalizedDiff + 1 / 2;
        let blueHue = (normalizedMaxValue - normalizedBlue) / 6 / normalizedDiff + 1 / 2;

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
        let {left, top} = this.paletteCanvasRef.current.getBoundingClientRect();
        let markerSize = 10;

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

        let rgb = this.extractColorByPaletteMarkerPosition();
        let cmyk = ReactColorPicker.rgb2cmyk(rgb);

        let hex = '';

        if (this.hasTransparency) {
            hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });
        } else {
            hex = ReactColorPicker.rgb2hex(rgb);
        }

        this.setState({
            ...this.state,
            ...cmyk,
            ...rgb,
            hex,
        });
    }, 10)

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onColorSliderChange = throttle((event) => {
        let hue, rgb, cmyk, hex;

        hue = parseInt(event.target.value);
        this.updatePalette(hue);

        rgb = this.extractColorByPaletteMarkerPosition();
        cmyk = ReactColorPicker.rgb2cmyk(rgb);

        if (this.hasTransparency) {
            hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });
        } else {
            hex = ReactColorPicker.rgb2hex(rgb);
        }

        this.setState({
            ...this.state,
            ...rgb,
            ...cmyk,
            hex,
            hue,
        });
    }, 15)

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onAlphaChannelSliderChange = throttle(({ target }) => {
        let red, green, blue, alpha, hex;

        red = this.state.red;
        green = this.state.green;
        blue = this.state.blue;
        alpha = Number(target.value);

        if (this.hasTransparency) {
            hex = ReactColorPicker.rgb2hex({ red, green, blue, alpha });
        } else {
            hex = ReactColorPicker.rgb2hex({ red, green, blue });
        }

        this.setState({
            ...this.state,
            alpha,
            hex,
        });
    }, 15)

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onAlphaChannelInputChange = ({ target }) => {
        let red, green, blue, numbersRegExp, maxValue, alpha, hex;

        red = this.state.red;
        green = this.state.green;
        blue = this.state.blue;
        numbersRegExp = /^[0-9]+$/;
        maxValue = 100;

        if (target.value.match(numbersRegExp) || target.value === '') {
            alpha = Number(target.value);

            if (alpha > maxValue) {
                alpha = maxValue;
            }

            if (this.hasTransparency) {
                hex = ReactColorPicker.rgb2hex({ red, green, blue, alpha });
            } else {
                hex = ReactColorPicker.rgb2hex({ red, green, blue });
            }

            this.setState({ ...this.state, hex, alpha });
        }

        // const width = 190
        // const offsetLeft = ((alpha * width) | 0) - 6;

        // const pointerStyle = {
        //     left: `${offsetLeft}px`,
        // };

        // this.alphaChannelSliderMarker.current.style.left = `${offsetLeft}px`
    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onHexInputChange = ({ target }) => {
        let hex = target.value;
        let validHexSymbolsRegExp = /#[0-9A-F]+/gi;

        if (hex.length <= 9 && hex.match(validHexSymbolsRegExp)) {
            if (hex.length === 4 || hex.length === 7 || hex.length === 9) {
                let rgb = ReactColorPicker.hex2rgb(hex);
                let hsv = ReactColorPicker.rgb2hsv(rgb);
                let cmyk = ReactColorPicker.rgb2cmyk(rgb);

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
        let numbers = /^[0-9]+$/;
        let maxValue = 255;

        if (target.value.match(numbers) || target.value === '') {
            let targetValue = Number(target.value);

            if (targetValue > maxValue) {
                targetValue = maxValue;
            }

            let rgb = {
                red: this.state.red,
                green: this.state.green,
                blue: this.state.blue,
                [target.name]: targetValue,
            };
            let cmyk = ReactColorPicker.rgb2cmyk(rgb);
            let hsv = ReactColorPicker.rgb2hsv(rgb);

            let hex = '';

            if (this.hasTransparency) {
                hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });
            } else {
                hex = ReactColorPicker.rgb2hex(rgb);
            }

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
        let numbers = /^[0-9]+$/;
        let maxValue = 100;

        if (target.value.match(numbers) || target.value === '') {
            let targetValue = Number(target.value);

            if (targetValue > maxValue) {
                targetValue = maxValue;
            }

            let cmyk = {
                cyan: this.state.cyan,
                magenta: this.state.magenta,
                yellow: this.state.yellow,
                black: this.state.black,
                [target.name]: targetValue,
            };
            let rgb = ReactColorPicker.cmyk2rgb(cmyk);
            let hsv = ReactColorPicker.rgb2hsv(rgb);

            let hex = '';

            if (this.hasTransparency) {
                hex = ReactColorPicker.rgb2hex({ ...rgb, alpha: this.state.alpha });
            } else {
                hex = ReactColorPicker.rgb2hex(rgb);
            }

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
            event.preventDefault();
            event.stopPropagation();
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
     * @todo normalize classnames e.g. to className="react-color-picker__container"
     * @returns {JSX.Element}
     */
    render() {
        return (
            <div className='container'>
                <div className='palette__container'>
                    <canvas
                        width="240"
                        height="240"
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
                <div className='preview-area'>
                    <div className='preview' ref={this.previewRef} />
                    <div className='preview-sliders'>
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
                        {this.hasTransparency && (
                            // <div
                            //     // onMouseDown={onMouseDown}
                            //     className="alpha"
                            // >
                            //     <div className="gradient" ref={this.alphaChannelSliderGradientRef} />
                            //     <div className="alpha-area">
                            //         <div className="alpha-mask">
                            //             <div className="picker-pointer" ref={this.alphaChannelSliderMarkerRef} />
                            //         </div>
                            //     </div>
                            // </div>
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
                                    value={this.state.alpha}
                                    onChange={this.onAlphaChannelSliderChange}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className='input-group'>
                    <Input value={this.state.hex} name="hex" classes="hex" label="HEX" onChange={this.onHexInputChange} />
                    <Input value={this.state.red} name="red" classes="rgb" label="R" onChange={this.onRgbInputChange} />
                    <Input value={this.state.green} name="green" classes="rgb" label="G" onChange={this.onRgbInputChange} />
                    <Input value={this.state.blue} name="blue" classes="rgb" label="B" onChange={this.onRgbInputChange} />
                    {this.mode === 'RGB' && this.hasTransparency && <Input value={this.state.alpha} name="alpha" classes="rgb" label="Alpha" onChange={this.onAlphaChannelInputChange} />}
                </div>
                <div className='input-group'>
                    {this.mode === 'CMYK' && (
                        <>
                            <Input value={this.state.cyan} name="cyan" classes="cmyk" label="C" onChange={this.onCmykInputChange} />
                            <Input value={this.state.magenta} name="magenta" classes="cmyk" label="M" onChange={this.onCmykInputChange} />
                            <Input value={this.state.yellow} name="yellow" classes="cmyk" label="Y" onChange={this.onCmykInputChange} />
                            <Input value={this.state.black} name="black" classes="cmyk" label="K" onChange={this.onCmykInputChange} />
                            {this.hasTransparency && <Input value={this.state.alpha} name="alpha" classes="rgb" label="Alpha" onChange={this.onAlphaChannelInputChange} />}
                        </>
                    )}
                </div>
            </div>
        )
    }
}