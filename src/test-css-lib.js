const css = require('./css-parse')

const data = `
.root .child {}

.root.active {}

:local(.foo) {}
:global .bar .bat {}

.monkeys {
  .apes {}
}

@media {
  .somewhere {}
}
`

const stuff = css(data)
console.log(stuff)