import {Dimension} from './dimension';
import {BBox} from './bbox';

export interface DatasetItem {
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
