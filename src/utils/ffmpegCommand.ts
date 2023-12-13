import type { TrackItem, VideoTractItem, AudioTractItem } from '@/stores/trackState';
import { transformRgb } from './common';
import { usePlayerState } from '@/stores/playerState';
import { createPinia } from 'pinia';
const pinia = createPinia();
const store = usePlayerState(pinia);

export class Command { // 命令封装
    // 音视频分离
    splitAudio(path: string, videoName: string, format: string) {
        const audioPath = Command.genVideoAAC(path, videoName);
        const videoPath = `${path}${videoName}.${format}`;
        return {
            commands: ['-v', 'quiet', '-i', videoPath, '-acodec', 'copy', '-vn', audioPath],
            videoPath,
            audioPath,
            audioName: Command.genVideoAAC('', videoName)
        };
    }
    // 音频合并
    mergeAudio(pathConfig: Record<string, any>, trackStart: number, trackList: TrackItem[], trackAttrMap: Record<string, any>) {
        const inputFiles:string[] = [];
        const filters:string[] = [];
        const filterSort:string[] = [];
        const { resourcePath, audioPath } = pathConfig;
        const outPath = `${audioPath}/audio.mp3`;
        let fileIndex = 0;
        trackList.forEach((trackItem, index) => {
            if (trackAttrMap[trackItem.id] && !trackAttrMap[trackItem.id].silent) {
                const { name, format, start, end, offsetL, offsetR } = trackItem as (VideoTractItem | AudioTractItem);
                let filterTag = `${fileIndex}`;
                if (offsetL > 0 || offsetR > 0) {
                    const clipS = (offsetL / 30).toFixed(2);
                    const clipE = ((end - start + offsetL) / 30).toFixed(2);
                    filters.push(`[${filterTag}]atrim=${clipS}:${clipE}[a${filterTag}]`);
                    filterTag = `a${fileIndex}`;
                }
                const delay = Math.floor((start - trackStart) / 30 * 1000);
                const resourceFile = `${resourcePath}${name}.${format}`;
                inputFiles.push('-i', resourceFile);
                filters.push(`[${filterTag}]adelay=${delay}|${delay}[s${fileIndex}]`);
                filterSort.push(`[s${fileIndex}]`);
                fileIndex++;
            }
        });
        filters.push(filterSort.join(''));
        const filterComplex = `${filters.join(';')}amix=inputs=${filterSort.length}:duration=longest:dropout_transition=0`;
        return {
            commands: [...inputFiles, '-filter_complex', filterComplex, '-f', 'mp3', `${outPath}`]
        };
    }
    // 视频合并
    mergeVideo(pathConfig: Record<string, any>, trackStart: number, trackList: TrackItem[], trackAttrMap: Record<string, any>) {
        const inputFiles:string[] = [];
        const { resourcePath, videoPath } = pathConfig;
        const outPath = `${videoPath}video123.mp4`;

        // 输出格式
        const outW = 1920;
        const outH = 1080;

        const filters:string[] = [];
        const filterSort:string[] = [];
        let fileIndex = 0;
        let videoIndex = 0;
        filters.push('[0:v]fps=30,pad=iw*1:ih*1[s0]');
        let lastOverlay = '';

        let preIdent = 's0';
        let nextIdent = 's0';

        // 播放器宽高
        let playerWidth = store.playerWidth;
        let playerHeight = store.playerHeight;

        // 1秒30帧
        trackList.forEach((trackItem, index) => {
            const trackAttrMapItem = trackAttrMap[trackItem.id];
            if (trackAttrMap[trackItem.id] && !trackAttrMap[trackItem.id].silent) {
                const { name, format, start, end, offsetL, offsetR } = trackItem as (VideoTractItem | AudioTractItem);
                // let filterTag = `${fileIndex}`;
                const stack = [];
                // const delay = Math.floor((start - trackStart) / 30);
                const delay = Math.floor((start - trackStart) / 30);

                console.log('delay', delay)

                // 输入
                if (trackItem.type === 'video') {
                    const resourceFile = `${resourcePath}${name}.${format}`;
                    inputFiles.push('-i', resourceFile);
                }

                // 计算覆盖x y坐标位置
                let x = trackAttrMapItem.left / playerWidth * outW;
                let y = trackAttrMapItem.top / playerHeight * outH;

                console.log(trackAttrMapItem.left, playerWidth, outW)
                // 视频
                if (trackItem.type === 'video') {
                    const pre = videoIndex === 0 ? nextIdent : `${videoIndex}:v`;

                    // 前标志位赋值
                    preIdent = pre;
                    let next = `ssss${videoIndex}`;

                    // 延迟
                    const setpts = `[${pre}]fps=30,setpts=PTS+${delay}/TB[ss${videoIndex}]`;
                    // 缩放
                    const scale = `[ss${videoIndex}]scale=iw*${trackAttrMapItem.scale / 100}:ih*${trackAttrMapItem.scale / 100}[sss${videoIndex}]`;
                    // 填充
                    const pad = `[sss${videoIndex}]pad=ceil(iw/2)*2:ceil(ih/2)*2[${next}]`;

                    stack.push(setpts, scale, pad);
                    if (videoIndex !== 0) {
                        const firstOver = lastOverlay;
                        const secondOver = next;
                        // 最后一个视频 还有问题 待优化  不给overlay加标签 否则会报错 Filter overlay:default has an unconnected output
                        lastOverlay = fileIndex === trackList.length - 1 ? '' : `[overlay${videoIndex}]`;

                        // let x = `floor(main_w/2-(overlay_w*${trackAttrMapItem.scale / 100}/2))${xPoi}`;
                        // let y = `floor(main_h/2-(overlay_h*${trackAttrMapItem.scale / 100}/2))${yPoi}`;

                        // 叠加视频 secondOver 叠加在 firstOver 上
                        const overlay = `${firstOver}[${secondOver}]overlay=${x}:${y}:enable='between(n,${start},${end})'${lastOverlay}`;
                        stack.push(overlay);

                        next = lastOverlay;
                    } else {
                        // 第一个视频的滤镜命名赋值给 lastOverlay
                        lastOverlay = `[${next}]`;

                        // 获取第一个视频的宽高
                        playerWidth = trackItem.width;
                        playerHeight = trackItem.height;
                    }
                    nextIdent = next;
                    videoIndex += 1;
                }
                // 文本
                if (trackItem.type === 'text') {
                    // 处理文本
                    const text = trackAttrMapItem.text;
                    const fontSize = trackAttrMapItem.fontSize;
                    const { r, g, b, a } = trackAttrMapItem.color;
                    const fontname = '/fonts/fangsongGBK.ttf';
                    const color = transformRgb(r, g, b);
                    const pre = nextIdent;

                    nextIdent = `text${fileIndex}`;

                    const textStr = `[${pre}]drawtext=fontfile='${fontname}':text='${text}':fontsize=${fontSize}:`
                        + `fontcolor=0x${color}@${a}:x=${x}:y=${y}:enable='between(n,${start},${end})'[${nextIdent}]`;

                    stack.push(textStr);
                    // + `fontcolor=white:x=${xPoi}:y=${yPoi}:enable='between(n,${start},${end})'`;
                }
                // console.log(stack.join(';'))
                if (stack.length > 0) {
                    filters.push(stack.join(';'));
                }
                fileIndex++;
            }
        });
        console.log('filters', filters.join(';'));
        console.log('trackAttrMap', trackAttrMap);
        console.log('trackList', trackList);

        // const filterComplex = `${filters.join(';')}amix=inputs=${filterSort.length}:duration=longest:dropout_transition=0`;
        // const filterComplex = `[0:v]pad=iw*1:ih*1[p0];[p0]setpts=PTS/TB[s0];[s0]scale=iw*0.86:ih*0.86[sc0];[1:v]setpts=PTS+1/TB[s1];[s1]scale=iw*0.56:ih*0.56[sc1];[sc0][sc1]overlay=50:50:enable='between(n,51,201)'`;
        // const filterComplex = ''
        // const x = `-vf select='if(lt(t,5),1,0)',fade=out:st=5:d=1`
        // '-c:v', 'libx264'
        return {
            commands: [...inputFiles, '-filter_complex', `${filters.join(';')}`, '-s', `${outW}x${outH}`, '-r', '30', `${outPath}`]
        };
    }
    // 视频抽帧
    genFrame(filePath: string, framePath: string, size: { w: number, h: number }, format = 'video', fps = 30) {
        if (format === 'gif') {
            const fileName = '/gif-%d.png';
            return {
                commands: ['-i', filePath, '-s', `${size.w}x${size.h}`, '-vf', 'colorkey=white:0.01:0.0', `${framePath}${fileName}`]
            };
        } else {
            const fileName = '/pic-%d.jpg';
            return {
                commands: ['-i', filePath, '-vf', `fps=${fps}`, '-s', `${size.w}x${size.h}`, `${framePath}${fileName}`]
            };
        }
    }
    // 指定开始结束时间抽帧
    genPlayFrame(videoPath: string, framePath: string, size: { w: number, h: number }, time: number, fps = 30) {
        const fileName = `/pic-${time}-%d.jpg`;
        return {
            commands: ['-ss', `${time}`, '-i', videoPath, '-ss', `0`, '-t', `${1}`, '-vf', `fps=${fps}`, '-s', `${size.w}x${size.h}`, `${framePath}${fileName}`]
        };
    }
    // 抽取指定帧数
    genPlayIFrame(videoPath: string, framePath: string, size: { w: number, h: number }, start: number) {
        const fileName = `/pic.jpg`;
        return {
            commands: ['-i', videoPath, '-vf', `select=eq(n\\,${start})`, '-s', `${size.w}x${size.h}`, '-vframes', `1`, `${framePath}${fileName}`]
        };
    }
    // 生成音频wave
    genWave(audioPath: string, videoName: string, wavePath: string, frameCount: number) {
        const fileName = `${videoName}.png`;
        return {
            commands: ['-i', audioPath, '-filter_complex', `aformat=channel_layouts=mono,compand,showwavespic=s=${frameCount * 5}x32:colors=yellow`, '-frames:v', '1', `${wavePath}${fileName}`],
            fileName
        };
    }
    static genVideoAAC(path: string, videoName: string) {
        return `${path}${videoName}_A.aac`;
    }
}