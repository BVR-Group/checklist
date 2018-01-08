import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'index.js',
  output: {
    'file': 'bundle.js',
    'format': 'iife'
  },
  plugins: [
    babel({
      babelrc: false,
      plugins: [
        ['transform-react-jsx', { pragma: 'h' }]
      ]
    }),
    resolve({
      jsnext: true
    })
  ],
  sourcemap: true
}