import {program} from 'commander';
import packageJson from '../package.json';
import yoloConvert from './yoloConvert';
import yoloMetadata from './yoloMetadata';


program.name(packageJson.name);
program.description(packageJson.description);
program.version(packageJson.version);

program.command('yolo-convert')
    .description('Converts and flattens the dataset from an associated JSON file')
    .argument('jsonFile', 'The JSON file to convert')
    .argument('class', 'className=number', (str) => {
        const vals = str.split('=');
        return [vals[0], parseInt(vals[1])];
    })
    .argument('outDir', 'The directory path to output to')
    .argument('fileNameTemplate', 'The template to map image numbers onto, e.g. [file].jpg')
    .action(yoloConvert);

program.command('yolo-generate-metadata')
    .description('Generates data.yaml')
    .argument('trainingDir', 'The location of training images')
    .argument('validationDir', 'The location of validation images')
    .argument('classCount', 'The number of classes', (val) => parseInt(val))
    .argument('classNames', 'The comma-separated names of classes', (val) => {
        return val.split(',').map(x => x.trim());
    })
    .action(yoloMetadata);

program.parse();
