// const css = require('./css-parse')
const postcss = require('postcss')
// const postCssWrap = require('./postcss-wrap')
const postCssWrap = require('./postcss-wrap2')

const data = `
.root h1 .child {}

.root.active {}

:local(.foo) {}
:global .bar :local(.bat) {}

.monkeys h1 {
  .apes {}
}

@media {
  .somewhere {}
}

div.foo >.monkey {}

.root .child :global :local(.monkey)) :local(:foo(.march) .funny) .bar.bat (h1 h2) ha ha{}

:local(.root) :global .monkey .banana {}
`

// const stuff = css(data)
// console.log(stuff)

postcss([postCssWrap()])
  .process(data, { from: undefined })
  .then(result => {
    // console.log(result)
  })