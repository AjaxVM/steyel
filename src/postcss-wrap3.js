
const { CssSelectorParser,  } = require('css-selector-parser')
const util = require('util')


function parseSelector(source) {
  // const sel = new Selector(source)
  const parser = new CssSelectorParser()

  parser.registerNestingOperators('>', '+', '~');

  const sel = parser.parse(source)

  const match = source === parser.render(sel)

  if (!match) {
    console.log(source)
    throw new Error('no match')
  }

  // console.log('AST:', JSON.stringify(sel.ast(), null, 2))
  // console.log('source', source)
  // console.log('reform', parser.render(sel))
  // console.log(sel.findValues('SelectorClassName'))
  // console.log(sel.findValues('SelectorClassName', 'value', 'root'))

  // const classNames = sel.findValues('SelectorClassName')
  // for (const className of classNames) {
  //   console.log(className.findParents('SelectorPseudo', 'name', ['global', 'local']))
  // }
}

module.exports = (opts = { }) => {
  // Work with options here

  return {
    postcssPlugin: 'postcss-wrap',
    Rule (decl) {
      // The faster way to find Declaration node
      const selectorObjs = []

      for (const selector of decl.selectors) {
        parseSelector(selector)
      }
    }
  }
}
module.exports.postcss = true