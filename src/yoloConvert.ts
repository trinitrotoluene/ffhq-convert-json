import {promises as fs} from 'fs';
import {DatasetItem} from './datasetItem';
import path from 'path';
import {Dimension} from './dimension';
import {BBox} from './bbox';
import {DerivedBBox} from './derivedBBox';
import FileUtils from './fileUtils';

export default async function (
    jsonFile: string,
    className: [string, number],
    outDir: string,
    fileNameTemplate: string
) {
    try {
        const json = await FileUtils.readJsonAsync(jsonFile);
        const dirCache: Record<string, boolean> = {};

        for (const key in json) {
            const item = json[key];
            const sourcePath = getItemPath(item, fileNameTemplate);

            if (!(await FileUtils.existsAsync(sourcePath))) {
                continue;
            }

            const annotation = generateYoloAnnotation(className[1], item);

            if (!dirCache[item.category]) {
                const dirName = path.join(outDir, item.category);
                console.log(`Creating dir ${dirName}`);
                await fs.mkdir(dirName, {recursive: true});
                dirCache[item.category] = true;
            }

            const outFile = path.join(outDir, item.category, path.basename(sourcePath));
            const outAnnotation = path.format({...path.parse(outFile), base: '', ext: '.txt'});
            console.log(`Out: ${outFile} -> ${outAnnotation}`);
            console.log(`Out: ${annotation}`);

            await fs.copyFile(sourcePath, outFile);
            await fs.writeFile(outAnnotation, annotation);
        }
    } catch (e) {
        console.error(`An error occurred during conversion:\r\n${e}`);
    }
}

function getItemPath(item: DatasetItem, fileNameTemplate: string) {
    const basePath = item.image.file_path.replace('images1024x1024/', '');
    const fileName = path.basename(basePath, path.extname(basePath));
    const formattedFileName = fileNameTemplate.replace('[file]', fileName);
    return path.join(path.dirname(basePath), formattedFileName);
}

function scaleBBox(source: Dimension, target: Dimension, boundingBox: DerivedBBox): DerivedBBox {
    const [sX, sY] = source;
    const [tX, tY] = target;
    const xRatio = tX / sX;
    const yRatio = tY / sY;

    return {
        centreX: boundingBox.centreX * xRatio,
        centreY: boundingBox.centreY * yRatio,
        dimensions: [
            boundingBox.dimensions[0] * xRatio,
            boundingBox.dimensions[1] * yRatio
        ]
    }
}

function convertBBox(boundingBox: BBox, dimensions: Dimension): DerivedBBox {
    const [w, h] = dimensions;
    const [x1, y1, x2, y2] = boundingBox;
    return {
        centreX: (x1 + x2) / 2 / w,
        centreY: (y1 + y2) / 2 / h,
        dimensions: [
            (x2 - x1) / w,
            (y2 - y1) / h
        ]
    };
}

function generateYoloAnnotation(itemClass: number, item: DatasetItem): string {
    // convert VOC to YOLO
    const scaledBBox = convertBBox(item.in_the_wild.face_rect, item.in_the_wild.pixel_size);

    //const scaledBBox = scaleBBox(item.in_the_wild.pixel_size, item.image.pixel_size, convertedBBox);

    // format to YOLO line
    const [bboxWidth, bboxHeight] = scaledBBox.dimensions;
    return `${itemClass} ${scaledBBox.centreX} ${scaledBBox.centreY} ${bboxWidth} ${bboxHeight}`;
}
