import {promises as fs} from 'fs';
import {DatasetItem} from './datasetItem';

function existsAsync(path: string): Promise<boolean> {
    return fs.stat(path).then(() => true, () => false);
}

async function readJsonAsync(path: string): Promise<Record<string, DatasetItem>> {
    if (!(await existsAsync(path))) {
        console.error(`Could not find JSON file: ${path}`);
        throw new Error();
    }

    const file = await fs.readFile(path, 'utf-8');
    return JSON.parse(file) as Record<string, DatasetItem>;
}

export default {
    existsAsync,
    readJsonAsync
};
