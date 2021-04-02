import pkg from './package.json';

const dependencyNames = Array.prototype.concat.call (
  Object.keys (pkg.dependencies),
  Object.keys (pkg.peerDependencies),
  ['fluture/index.js', 'path']
);

export default {
  input: 'index.js',
  external: dependencyNames,
  output: {
    format: 'cjs',
    file: 'dist/cjs.js',
    exports: 'named',
    interop: false,
    globals: {},
    paths: {
      'fluture/index.js': 'fluture',
    },
  },
};
