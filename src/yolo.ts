import {promises as fs} from 'fs';
import {DatasetItem} from './datasetItem';
import path from 'path';
import {Dimension} from './dimension';
import {BBox} from './bbox';
import {DerivedBBox} from './derivedBBox';
import FileUtils from './fileUtils';

export default async function (jsonFile: string, className: string[], outDir: string) {
    try {
        const json = await FileUtils.readJsonAsync(jsonFile);
        const dirCache: Record<string, boolean> = {};

        for (const key in json) {
            const item = json[key];
            const sourcePath = getItemPath(item);

            if (!(await FileUtils.existsAsync(sourcePath))) {
                continue;
            }

            const annotation = generateYoloAnnotation(1, item);

            if (!dirCache[item.category]) {
                const dirName = path.join(outDir, item.category);
                console.log(`Creating dir ${dirName}`);
                await fs.mkdir(dirName, {recursive: true});
                dirCache[item.category] = true;
            }

            const outFile = path.join(outDir, item.category, path.basename(sourcePath));
            const outAnnotation = path.format({...path.parse(outFile), base: '', ext: '.txt'});
            console.log(`Out: ${outFile}`);
            console.log(`Out: ${outAnnotation}`);

            await fs.copyFile(sourcePath, outFile);
            await fs.writeFile(outAnnotation, annotation);
        }
    } catch (e) {
        console.error(`An error occurred during conversion:\r\n${e}`);
    }
}

function getItemPath(item: DatasetItem) {
    const basePath = item.image.file_path.replace('images1024x1024/', '');
    // todo: derive class from this?
    const fileName = path.basename(basePath, path.extname(basePath)) + '_Mask' + '.jpg';
    return path.join(path.dirname(basePath), fileName);
}

function scaleBBox(source: Dimension, target: Dimension, boundingBox: BBox): BBox {
    const [sX, sY] = source;
    const [tX, tY] = target;
    const xRatio = tX / sX;
    const yRatio = tY / sY;

    const [x1, y1, x2, y2] = boundingBox;
    return [x1 * xRatio, y1 * yRatio, x2 * xRatio, y2 * yRatio];
}

function convertBBox(boundingBox: BBox): DerivedBBox {
    const [x1, y1, x2, y2] = boundingBox;
    return {
        centreX: (x1 + x2) / 2,
        centreY: (y1 + y2) / 2,
        dimensions: [
            (x2 - x1),
            (y2 - y1)
        ]
    };
}

function clampDerivedBBox(boundingBox: DerivedBBox, dimensions: Dimension): DerivedBBox {
    const [width, height] = dimensions;
    return {
        centreX: boundingBox.centreX / width,
        centreY: boundingBox.centreY / height,
        dimensions: [
            boundingBox.dimensions[0] / width,
            boundingBox.dimensions[1] / height
        ]
    };
}

function generateYoloAnnotation(itemClass: number, item: DatasetItem): string {
    // rescale the bounding box
    const scaledBBox = scaleBBox(
        item.in_the_wild.pixel_size,
        item.image.pixel_size,
        item.in_the_wild.face_rect
    );

    // convert it to derived bounding box
    const convertedBBox = convertBBox(scaledBBox);

    // scale values between 0 - 0.1
    const clampedBBox = clampDerivedBBox(convertedBBox, item.image.pixel_size);

    // format to YOLO line
    const [bboxWidth, bboxHeight] = clampedBBox.dimensions;
    return `${itemClass} ${clampedBBox.centreX} ${clampedBBox.centreY} ${bboxWidth} ${bboxHeight}`;
}
