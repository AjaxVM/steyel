
const {
  getCompiler,
  localRegex,
} = require('./utils')
const loader = require('../src')

test('Basically works', async () => {
  const stats = await getCompiler('fixtures/basic.css')
  const output = stats.toJson({ source: true }).modules[0].source

  expect(output).toMatch(localRegex('root'))
  expect(output).toMatch(localRegex('child', false))
})