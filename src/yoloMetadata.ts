import yaml from 'js-yaml';
import * as fs from 'fs/promises';

export default async function (
    trainingDir: string,
    validationDir: string,
    classCount: number,
    classNames: string[]
) {
    if (classCount !== classNames.length) {
        console.error('Too many or too few class names provided for this class count');
        return;
    }

    const output = yaml.dump({
        train: trainingDir,
        val: validationDir,
        nc: classCount,
        classNames: classNames
    });

    await fs.writeFile('./data.yaml', output);
}
