// const css = require('./css-parse')
const postcss = require('postcss')
// const postCssWrap = require('./postcss-wrap')
const postCssWrap2 = require('./postcss-wrap2')
const postCssWrap3 = require('./postcss-wrap3')
const postCssWrap4 = require('./postcss-wrap4')

const cleanData = `
div.screwthis {}

.root h1 .child {}

.root.active {}

div.foo > .monkey {}

@media {
  .somewhere {}
}

.monkeys h1 {
  .apes {}
}

.root::first-line {}

.root:hover {}
`

const edgeCaseData = `
${cleanData}

:local(.root) :global .monkey .banana {}

:something.foo {}

div.foo >.monkey {}

:local(.foo) {}

:global .bar :local(.bat) {}

.root .child :global :local(.monkey) :local(:foo(.march) .funny) .bar.bat (h1 h2) ha ha{}

:local(:global .funky) {}
`

// const stuff = css(data)
// console.log(stuff)


// postcss([postCssWrap()])
//   .process(data, { from: undefined })
//   .then(result => {
  //     // console.log(result)
  //   })

async function run(plugin, data) {
  const start = process.hrtime()
  await postcss([plugin()])
    .process(data || cleanData, { from: undefined })
    // .then(result => {
    //   // console.log(result)
    // })

  const end = process.hrtime(start)

  return end[0]*1000 + end[1]/1000000
}

async function test(plugin, name, n=100, data) {
  const times = []
  for (let i=0; i<n; i++) {
    const result = await run(plugin, data)
    times.push(result)
  }

  console.log({
    name,
    high: `${Math.max(...times)}ms`,
    low: `${Math.min(...times)}ms`,
    mean: `${times.reduce((a,b) => a+b, 0) / n}ms`,
  })
}

// test(postCssWrap2, 'postCssWrap2')
// test(postCssWrap3, 'postCssWrap3')
// test(postCssWrap4, 'postCssWrap4')

run(postCssWrap4, edgeCaseData)