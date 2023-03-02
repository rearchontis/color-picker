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

        let rgb, hsv, cmyk, hex;

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

        rgb = { ...initialValue };
        cmyk = ReactColorPicker.rgb2cmyk(rgb);
        hsv = ReactColorPicker.rgb2hsv(rgb);

        if (hasTransparency) {
            rgb.alpha = initialValue.alpha && 100;

            this.alphaChannelSliderRef = React.createRef();
            this.alphaChannelSliderGradientRef = React.createRef();
        }

        hex = ReactColorPicker.rgb2hex(rgb);

        this.state = {
            ...hsv,
            ...rgb,
            ...cmyk,
            hex,
        }
    }

    /**
     *
     */
    componentDidMount() {
        let CSSColor, CSSPreviewColor, rgb;

        document.addEventListener('mouseup', this.onPalatteMouseUp);
        document.addEventListener('mousemove', this.onPaletteMouseMove);

        this.canvasContext = this.paletteCanvasRef.current.getContext('2d', { willReadFrequently: true });

        this.updatePalette(this.state.hue);
        this.updatePaletteMarkerPosition(this.state.saturation, this.state.value);

        rgb = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 });
        this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 1)`);

        CSSColor = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, 1)`;
        this.paletteMarkerRef.current.style.setProperty('--current-color', CSSColor);

        if (this.hasTransparency) {
            CSSPreviewColor = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, ${this.state.alpha / 100})`;

            this.previewRef.current.style.setProperty('--current-color', CSSPreviewColor);
            this.alphaChannelSliderRef.current.style.setProperty('--current-color', CSSPreviewColor);
            this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', CSSColor);
        } else {
            CSSPreviewColor = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
            this.previewRef.current.style.setProperty('--current-color', CSSPreviewColor);
        }


    }

    componentDidUpdate() {
        let CSSColor, CSSPreviewColor, rgb;

        rgb = ReactColorPicker.hsl2rgb({ hue: this.state.hue, saturation: 100, lightness: 50 });
        this.rainbowSliderRef.current.style.setProperty('--current-color', `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, 1)`);

        CSSColor = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
        this.paletteMarkerRef.current.style.setProperty('--current-color', CSSColor);

        if (this.hasTransparency) {
            CSSPreviewColor = `rgba(${this.state.red}, ${this.state.green}, ${this.state.blue}, ${this.state.alpha / 100})`;

            this.previewRef.current.style.setProperty('--current-color', CSSPreviewColor);
            this.alphaChannelSliderRef.current.style.setProperty('--current-color', CSSPreviewColor);
            this.alphaChannelSliderGradientRef.current.style.setProperty('--current-color', CSSColor);
        } else {
            CSSPreviewColor = `rgb(${this.state.red}, ${this.state.green}, ${this.state.blue})`;
            this.previewRef.current.style.setProperty('--current-color', CSSPreviewColor);
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
        let rgb, canvasWidth, canvasHeight, gradientH, gradientV;

        canvasWidth = this.canvasContext.canvas.width;
        canvasHeight = this.canvasContext.canvas.height;

        this.canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

        rgb = ReactColorPicker.hsl2rgb({ hue, saturation: 100, lightness: 50 });

        gradientH = this.canvasContext.createLinearGradient(1, 1, canvasWidth - 1, 1);
        gradientH.addColorStop(0, 'rgba(255,255,255,1)');
        gradientH.addColorStop(1, `rgba(${rgb.red},${rgb.green},${rgb.blue},1)`);

        this.canvasContext.fillStyle = gradientH;
        this.canvasContext.fillRect(0, 0, canvasWidth, canvasHeight - 1);

        gradientV = this.canvasContext.createLinearGradient(1, 1, 1, canvasHeight - 1);
        gradientV.addColorStop(0, 'rgba(0,0,0,0)');
        gradientV.addColorStop(1, 'rgba(0,0,0,1)');

        this.canvasContext.fillStyle = gradientV;
        this.canvasContext.fillRect(0, 0, canvasWidth, canvasHeight - 1);
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
     * }} rgb
     * @returns {string} hex
     */
    static rgb2hex = ({ red, green, blue }) => {
        let pad = (n) => n.toString(16).padStart(2, '0');

        return `#${pad(red)}${pad(green)}${pad(blue)}`;
    }

    /**
     *
     * @param {string} hex
     * @returns {{
     *      red: number,
     *      green: number,
     *      blue: number,
     *      alpha?: number,
     *      hex?: string,
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

            let rhex = hex.slice(0, 2);
            let ghex = hex.slice(2, 4);
            let bhex = hex.slice(4, 6);

            return {
                red: parseInt(rhex, 16) | 0,
                green: parseInt(ghex, 16) | 0,
                blue: parseInt(bhex, 16) | 0,
            };
        }
    }

    /**
     *
     * @param {{ red, green, blue }} color
     * @returns {{ hue, saturation, value }} hsv
     */
    static rgb2hsv = ({ red, green, blue }) => {
        let normalizedRed, normalizedGreen, normalizedBlue, normalizedMinValue, normalizedMaxValue, normalizedDiff;

        normalizedRed = red / 255;
        normalizedGreen = green / 255;
        normalizedBlue = blue / 255;
        normalizedMinValue = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
        normalizedMaxValue = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
        normalizedDiff = normalizedMaxValue - normalizedMinValue;

        if (normalizedDiff === 0) {
            return {
                hue: Math.round(0 * 360),
                saturation: Math.round(0 * 100),
                value: Math.round(normalizedMaxValue * 100),
            };
        }

        let normalizedSaturation, redHue, greenHue, blueHue, normalizedHue;

        normalizedSaturation = normalizedDiff / normalizedMaxValue;
        redHue = (normalizedMaxValue - normalizedRed) / 6 / normalizedDiff + 1 / 2;
        greenHue = (normalizedMaxValue - normalizedGreen) / 6 / normalizedDiff + 1 / 2;
        blueHue = (normalizedMaxValue - normalizedBlue) / 6 / normalizedDiff + 1 / 2;

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
            hex = ReactColorPicker.rgb2hex(rgb);
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
    onColorSliderChange = (event) => {
        let hue, rgb, cmyk, hex;

        hue = parseInt(event.target.value);
        this.updatePalette(hue);

        rgb = this.extractColorByPaletteMarkerPosition();
        cmyk = ReactColorPicker.rgb2cmyk(rgb);

        if (this.hasTransparency) {
            hex = ReactColorPicker.rgb2hex(rgb);
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
    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onAlphaChannelSliderChange = ({ target }) => {
        let red, green, blue, alpha, hex;

        red = this.state.red;
        green = this.state.green;
        blue = this.state.blue;
        alpha = Number(target.value);

        if (this.hasTransparency) {
            hex = ReactColorPicker.rgb2hex({ red, green, blue });
        } else {
            hex = ReactColorPicker.rgb2hex({ red, green, blue });
        }

        this.setState({
            ...this.state,
            alpha,
            hex,
        });
    }

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

        if (numbersRegExp.test(target.value) || target.value === '') {
            alpha = Number(target.value);

            if (alpha > maxValue) {
                alpha = maxValue;
            }

            if (this.hasTransparency) {
                hex = ReactColorPicker.rgb2hex({ red, green, blue });
            } else {
                hex = ReactColorPicker.rgb2hex({ red, green, blue });
            }

            this.setState({ ...this.state, hex, alpha });
        }
    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onHexInputChange = ({ target }) => {
        let longHexFormatRegExp = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)|(^#{0,1}[0-9A-F]{8}$)/i;
        let hex = target.value;

        if (longHexFormatRegExp.test(hex)) {
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
            this.setState({ ...this.state, hex: target.value })
        }


        // if (hexMatch && hexMatch[0].length <= 9) {
        //     let hex = hexMatch[0];

        //     if (isHex && hex.length === 9 && parseInt(hex.slice(7, 9), 16) > 100) {
        //         hex = `#${hex.slice(0, 7)}64`;
        //     }

        //     if (isHex && hex.length === 4 || hex.length === 7 || hex.length === 9) {
        //         let rgb = ReactColorPicker.hex2rgb(hex);
        //         let hsv = ReactColorPicker.rgb2hsv(rgb);
        //         let cmyk = ReactColorPicker.rgb2cmyk(rgb);

        //         this.updatePalette(hsv.hue);
        //         this.updatePaletteMarkerPosition(hsv.saturation, hsv.value);

        //         this.setState({
        //             ...this.state,
        //             ...cmyk,
        //             ...rgb,
        //             ...hsv,
        //             hex,
        //         });
        //     } else {
        //         this.setState({ ...this.state, hex });
        //     }
        // }
    }

    /**
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event
     */
    onRgbInputChange = ({ target }) => {
        let numbersRegExp = /^[0-9]+$/;
        let maxValue = 255;

        if (numbersRegExp.test(target.value) || target.value === '') {
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

            let hex;

            if (this.hasTransparency) {
                hex = ReactColorPicker.rgb2hex(rgb);
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
        let numbersRegExp = /^[0-9]+$/;

        let maxValue = 100;

        if (numbersRegExp.test(target.value) || target.value === '') {
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
                hex = ReactColorPicker.rgb2hex(rgb);
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
     * @returns {JSX.Element}
     */
    render() {
        console.log(this.state.hex)
        return (
            <div className="react-color-picker__container">
                <div className="react-color-picker__palette">
                    <canvas
                        width="240"
                        height="240"
                        ref={this.paletteCanvasRef}
                        className="react-color-picker__palette palette__canvas"
                        onClick={this.onPaletteMarkerMove}
                        onMouseUp={this.onPalatteMouseUp}
                        onMouseDown={this.onPaletteMouseDown}
                    />
                    <div
                        ref={this.paletteMarkerRef}
                        className="react-color-picker__palette palette__marker"
                        onMouseDown={this.onPaletteMouseDown}
                        onMouseMove={this.onPaletteMouseMove}
                        onMouseUp={this.onPalatteMouseUp}
                    />
                </div>

                <div className="react-color-picker__preview-area">
                    <div
                        className="react-color-picker__preview-area preview-box"
                        ref={this.previewRef}
                    />
                    <div className="react-color-picker__preview-area preview-sliders">
                        <div className="react-color-picker__preview-area slider__container">
                            <div
                                className="react-color-picker__preview-area slider__gradient"
                            />
                            <input
                                className=" react-color-picker__preview-area slider__control"
                                onChange={this.onColorSliderChange}
                                ref={this.rainbowSliderRef}
                                value={this.state.hue}
                                type="range"
                                step={1}
                                min="0"
                                max="360"
                            />
                        </div>
                        {this.hasTransparency && (
                            <div className="react-color-picker__preview-area slider__container">
                                <div
                                    className="react-color-picker__preview-area slider__gradient slider__alpha"
                                    ref={this.alphaChannelSliderGradientRef}
                                />
                                <div
                                    className="react-color-picker__preview-area slider__background slider__alpha"
                                />
                                <input
                                    className="react-color-picker__preview-area slider__control"
                                    onChange={this.onAlphaChannelSliderChange}
                                    ref={this.alphaChannelSliderRef}
                                    value={this.state.alpha}
                                    type="range"
                                    step={1}
                                    min="0"
                                    max="100"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="react-color-picker__input-group">
                    <Input value={this.state.hex} name="hex" className="hex" label="HEX" onChange={this.onHexInputChange} />
                    <Input value={this.state.red} name="red" className="rgb" label="R" onChange={this.onRgbInputChange} />
                    <Input value={this.state.green} name="green" className="rgb" label="G" onChange={this.onRgbInputChange} />
                    <Input value={this.state.blue} name="blue" className="rgb" label="B" onChange={this.onRgbInputChange} />
                    {this.mode === 'RGB' && this.hasTransparency && (
                        <Input
                            value={this.state.alpha}
                            name="alpha"
                            className="alpha"
                            label="Alpha"
                            onChange={this.onAlphaChannelInputChange}
                        />
                    )}
                </div>

                <div className="react-color-picker__input-group">
                    {this.mode === 'CMYK' && (
                        <>
                            <Input value={this.state.cyan} name="cyan" className="cmyk" label="C" onChange={this.onCmykInputChange} />
                            <Input value={this.state.magenta} name="magenta" className="cmyk" label="M" onChange={this.onCmykInputChange} />
                            <Input value={this.state.yellow} name="yellow" className="cmyk" label="Y" onChange={this.onCmykInputChange} />
                            <Input value={this.state.black} name="black" className="cmyk" label="K" onChange={this.onCmykInputChange} />
                            {this.hasTransparency && (
                                <Input
                                    value={this.state.alpha}
                                    name="alpha"
                                    className="alpha"
                                    label="Alpha"
                                    onChange={this.onAlphaChannelInputChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }
}