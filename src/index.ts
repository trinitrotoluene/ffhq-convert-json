import {program} from 'commander';
import packageJson from '../package.json';
import yolo from './yolo';


program.name(packageJson.name);
program.description(packageJson.description);
program.version(packageJson.version);

program.command('yolo-convert')
    .description('Converts and flattens the dataset from an associated JSON file')
    .argument('jsonFile', 'The JSON file to convert')
    .argument('className', 'className=number', (str) => {
        const vals = str.split('=');
        return [vals[0], vals[1]];
    })
    .argument('outDir', 'The directory path to output to')
    .action(yolo);

program.parse();
