// 生成 16 进制指定长度的字符串
function getRandom(len: number) {
    return Math.floor((1 + Math.random()) * (16 ** len))
        .toString(16)
        .substring(1);
}
/**
 *  时间格式化
 * */
export function formatTime(time: number) {
    let second = Math.ceil(time / 1000);
    const s = second % 60;
    second = Math.floor(second / 60);
    const m = second % 60;
    second = Math.floor(second / 60);
    const h = second % 60;
    return {
        s,
        m,
        h,
        str: `${h === 0 ? '' : `${h < 10 ? '0' : ''}${h}:`}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    };
}
export function formatPlayerTime(frameCount: number) {
    let f = frameCount % 30;
    frameCount = Math.floor(frameCount / 30);
    let s = frameCount % 60;
    frameCount = Math.floor(frameCount / 60);
    let m = frameCount % 60;
    frameCount = Math.floor(frameCount / 60);
    let h = frameCount;
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}:${f < 10 ? '0' : ''}${f}`;
}
/**
 *  获取随机ID，组件拖到预览视图后就会被设置个ID
 * */
export function getId(prefix = 't') {
    return `${prefix ? `${prefix}-` : ''}${getRandom(5)}${getRandom(3)}-${getRandom(4)}`;
}
/**
 * 下载文件
 * */
export function downloadFileUrl(href: string, fileName: string) {
    const downloadElement = document.createElement('a');
    downloadElement.href = href;
    // 下载后文件名
    downloadElement.download = fileName;
    document.body.appendChild(downloadElement);
    downloadElement.click();
    document.body.removeChild(downloadElement);
    // 释放掉blob对象
    window.URL.revokeObjectURL(href);
    downloadElement.href = '';
}
export function computedItemShowArea(trackItem: Record<string, any>, canvasSize: { width: number, height: number }, trackAttr: Record<string, any>) {
    let { left = 0, top = 0, scale = 100, text, fontSize } = trackAttr;
    const { width, height, type } = trackItem;
    const { width: playerW, height: playerH } = canvasSize;
    let defaultW = playerW;
    let defaultH = playerH;
    if (type === 'video') {
        const proportionalW = Math.floor(playerH / height * width); // 等高宽度
        const proportionalH = Math.floor(playerW / width * height); // 等宽高度
        // 默认渲染位置
        if (proportionalW > playerW) { // 等高场景下宽度溢出，则采用等宽， 高度上下留白
            defaultH = proportionalH;
        } else if (proportionalH > playerH) { // 等宽场景下高度溢出，则采用等高， 宽度左右留白
            defaultW = proportionalW;
        }
    }
    if (type === 'image') {
        defaultW = width;
        defaultH = width;
    }
    if (type === 'text') {
        defaultW = text.length * fontSize;
        defaultH = fontSize * 1.2;
    }
    // 由默认位置计算偏移缩放位置
    const scaleW = Math.floor(defaultW * scale / 100);
    const scaleH = Math.floor(defaultH * scale / 100);
    const scaleL = Math.floor(left);
    const scaleT = Math.floor(top);
    const diffW = Math.floor(playerW - scaleW);
    const diffH = Math.floor(playerH - scaleH);
    return {
        drawL: scaleL,
        drawT: scaleT,
        drawW: scaleW,
        drawH: scaleH,
        sourceWidth: width,
        sourceHeight: height,
        defaultW,
        defaultH,
        diffW,
        diffH
    };
}
export function isVideo(type: string) {
    return type === 'video';
}

/**
 * 校准XY位置以中心为基准
 * @param {number} x 原x值
 * @param {number} y 原y值
 * @param {number} width 视频宽度
 * @param {number} height 视频高度
 * @returns {Object} {x,y}
 */
export function poiXYBaseCenter(x: number, y: number, width: number, height: number) {
    return {
        x: x + width / 2,
        y: y + height / 2
    };
}

/**
 * rgb 转换成 16进制
 * @param r 通道r
 * @param g 通道g
 * @param b 通道b
 * @returns 转换后的16进制
 */
export function transformRgb(r: number, g: number, b: number) {
    return r.toString(16) + g.toString(16) + b.toString(16);
}

// 封装json格式化, 避免error
export function getJsonParse(jsonStr: string): any {
    let res = '';
    try {
        res = JSON.parse(jsonStr);
    } catch (e) {
        console.log(e);
        res = '';
    }
    return res;
}