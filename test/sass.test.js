
const {
  getCompiler,
  localRegex,
} = require('./utils')
const loader = require('../src')

test('Basically works', async () => {
  const stats = await getCompiler('fixtures/basic.scss', {
    test: /\.s[ac]ss$/i,
    preLoaders: ['sass-loader']
  })
  const output = stats.toJson({ source: true }).modules[0].source

  console.log(output)

  expect(output).toMatch(localRegex('root'))
  expect(output).toMatch(localRegex('child', false))
})