import { exec } from 'node:child_process';
import fs from 'node:fs';

import { __DEV__, ENABLE_DEVTOOLS, HOST, HRM_PATH, PORT, PROJECT_ROOT } from './constants';
import { resolveServer, resolveSrc } from './path';

const HMR_URL = encodeURIComponent(`http://${HOST}:${PORT}${HRM_PATH}`);
// !: 必须指定 path 为 devServer 的地址，不然的话热更新 client 会向 chrome://xxx 请求
const HMRClientScript = `webpack-hot-middleware/client?path=${HMR_URL}&reload=true&overlay=true`;

const backgroundPath = resolveSrc('background/index.ts');
const optionsPath = resolveSrc('options/index.tsx');
const popupPath = resolveSrc('popup/index.tsx');

const devEntry: Record<string, string[]> = {
    background: [backgroundPath],
    options: [HMRClientScript, optionsPath],
    popup: [HMRClientScript, popupPath],
};
const prodEntry: Record<string, string[]> = {
    background: [backgroundPath],
    options: [optionsPath],
    popup: [popupPath],
};
const entry = __DEV__ ? devEntry : prodEntry;

if (ENABLE_DEVTOOLS) {
    entry.options.unshift('react-devtools');
    entry.popup.unshift('react-devtools');
    exec(
        'npx react-devtools',
        {
            cwd: PROJECT_ROOT,
        },
        (error) => {
            console.error('Startup react-devtools occur error');
            error && console.error(error);
        },
    );
}

const contentsDirs = fs.readdirSync(resolveSrc('contents'));
const validExtensions = ['tsx', 'ts'];
contentsDirs.forEach((contentScriptDir) => {
    const hasValid = validExtensions.some((ext) => {
        const abs = resolveSrc(`contents/${contentScriptDir}/index.${ext}`);
        if (fs.existsSync(abs)) {
            entry[contentScriptDir] = [abs];
            return true;
        }

        return false;
    });

    if (!hasValid) {
        const dir = resolveSrc(`contents/${contentScriptDir}`);
        throw new Error(`You must put index.tsx or index.ts under directory: ${dir}`);
    }
});

// NOTE: 有可能用户没打算开发 content script，所以 contents/all 这个文件夹可能不存在
if (entry.all && __DEV__) {
    entry.all.unshift(resolveServer('utils/allTabClient.ts'));
    entry.background.unshift(resolveServer('utils/backgroundClient.ts'));
}

export default entry;
