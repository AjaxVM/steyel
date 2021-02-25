// const css = require('./css-parse')
const postcss = require('postcss')
// const postCssWrap = require('./postcss-wrap')
const postCssWrap2 = require('./postcss-wrap2')
const postCssWrap3 = require('./postcss-wrap3')

const data = `
.root h1 .child {}

.root.active {}

/*:local(.foo) {}
:global .bar :local(.bat) {}

.monkeys h1 {
  .apes {}
}

@media {
  .somewhere {}
}

div.foo > .monkey {}

.root .child :global :local(.monkey) :local(:foo(.march) .funny) .bar.bat (h1 h2) ha ha{}

:local(.root) :global .monkey .banana {}

.root::first-line {}*/
`

// const stuff = css(data)
// console.log(stuff)


// postcss([postCssWrap()])
//   .process(data, { from: undefined })
//   .then(result => {
  //     // console.log(result)
  //   })

async function run(plugin) {
  const start = process.hrtime()
  await postcss([plugin()])
    .process(data, { from: undefined })
    // .then(result => {
    //   // console.log(result)
    // })

  const end = process.hrtime(start)

  return end[0]*1000 + end[1]/1000000
}

async function test(plugin, name, n=100) {
  const times = []
  for (let i=0; i<n; i++) {
    const result = await run(plugin)
    times.push(result)
  }

  console.log({
    name,
    high: `${Math.max(...times)}ms`,
    low: `${Math.min(...times)}ms`,
    mean: `${times.reduce((a,b) => a+b, 0) / n}ms`,
  })
}

test(postCssWrap2, 'postCssWrap2')
test(postCssWrap3, 'postCssWrap3')