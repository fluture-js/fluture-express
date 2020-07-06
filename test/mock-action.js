import {resolve} from 'fluture/index.js';
import {Json} from '../index.js';

export default _ => resolve (Json (200) ({foo: 'bar'}));
