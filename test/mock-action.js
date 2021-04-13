import {resolve} from 'fluture';
import {Json} from '../index.js';

export default _ => _ => resolve (Json ({foo: 'bar'}));
