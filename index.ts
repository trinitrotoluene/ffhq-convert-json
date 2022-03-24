import {Argument, program} from 'commander';
import packageJson from './package.json';
import {promises as fs} from 'fs';


program.name(packageJson.name);
program.description(packageJson.description);
program.version(packageJson.version);

program.command('convert')
    .description('Converts and flattens the dataset from an associated JSON file')
    .argument('jsonFile', 'The JSON file to convert')
    .addArgument(new Argument('format', 'The format to convert to').choices(['yolo']))
    .action(convert);

type Format = 'yolo';

async function convert(jsonFile: string, format: Format) {
    const fileExists = await fs.stat(jsonFile)
        .then(() => true, () => false);

    if (!fileExists) {
        console.error(`Could not find JSON file: ${jsonFile}`);
    }

    try {
        const file = await fs.readFile(jsonFile, 'utf-8');
        const json = JSON.parse(file) as Record<string, DatasetItem>;
        for (const key in json) {
            const item = json[key];

        }
    } catch (e) {
        console.error(`Failed to parse JSON file:\r\n${e}`);
    }
}

type BBox = [x1: number, y1: number, x2: number, y2: number]
type Dimension = [width: number, height: number]

interface DatasetItem {
    category: 'training' | 'validation';
    image: {
        file_path: string
        pixel_size: Dimension
    };
    in_the_wild: {
        pixel_size: Dimension
        face_rect: BBox
    };
}

function scaleBBox(source: Dimension, target: Dimension, boundingBox: BBox): BBox {
    const [sX, sY] = source;
    const [tX, tY] = target;
    const xRatio = tX / sX;
    const yRatio = tY / sY;

    const [x1, y1, x2, y2] = boundingBox;
    return [x1 * xRatio, y1 * yRatio, x2 * xRatio, y2 * yRatio];
}

interface DerivedBBox {
    centre_x: number;
    centre_y: number;
    dimensions: Dimension;
}

function convertBBox(boundingBox: BBox): DerivedBBox {
    const [x1, y1, x2, y2] = boundingBox;
    return {
        centre_x: (x1 + x2) / 2,
        centre_y: (y1 + y2) / 2,
        dimensions: [
            (x2 - x1),
            (y2 - y1)
        ]
    };
}

function clampDerivedBBox(boundingBox: DerivedBBox, dimensions: Dimension): DerivedBBox {
    const [width, height] = dimensions;
    return {
        centre_x: boundingBox.centre_x / width,
        centre_y: boundingBox.centre_y / height,
        dimensions: [
            boundingBox.dimensions[0] / width,
            boundingBox.dimensions[1] / height
        ]
    };
}

function generateYoloAnnotation(item_class: number, item: DatasetItem): string {
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
    return `${item_class} ${clampedBBox.centre_x} ${clampedBBox.centre_y} ${bboxWidth} ${bboxHeight}`;
}