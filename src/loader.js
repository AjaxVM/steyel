// const cssLoader = require('css-loader')
// const extractCssClasses = require('./extract-css-classes')

// function deepMerge(objA, objB) {
//   if (!(objA && objB)) {
//     return objA || objB
//   }

//   const out = {...objA}

//   for (const key in objB) {
//     const valueA = out[key]
//     const valueB = objB[key]
//     if (!valueA) {
//       out[key] = valueB
//     } else {
//       if (typeof valueB === 'object') {
//         out[key] = deepMerge(valueA, valueB)
//       } else {
//         out[key] = valueB
//       }
//     }
//   }

//   return out
// }

// const defaultCssLoaderOptions = {
//   modules: {
//     mode: 'pure',
//     // exportGlobals: true,
//     localIdentName: 'steyel-[hash:base64]',
//   }
// }

// function postProcessing(callback, classes, ...args) {
//   const [argTarget, source, ...otherArgs] = args
//   console.log(argTarget, source)
//   const fragment = source.match(/\.locals\ *=\ *\{(.*\:.*)\}/msi)
  
//   if (!(fragment && fragment.length)) {
//     // nothing to do here
//     callback(...args)
//     return
//   }

//   // extract mappings
//   const inner = fragment[1]
//   const locals = {}

//   for (const pair of inner.split(',')) {
//     let [left, right] = pair.split(':').map(item => item.trim().slice(1, -1))
//     locals[left] = `${left} ${right}`
//   }

//   for (const cls of classes.other) {
//     const clsName = cls.slice(1)
//     locals[clsName] = clsName
//   }

//   const out = source.replace(fragment[0], `.locals = ${JSON.stringify(locals, null, 2)}`)
//   callback(argTarget, out, ...otherArgs)
// }

// module.exports = function (source) {
//   let out = source
//   // find all classes
//   const classes = extractCssClasses(out)
  
//   // flag all base classes as ":local .class"
//   for (const cls of classes.root) {
//     out = out.replace(new RegExp(cls, 'g'), `:local ${cls}`)
//   }
  
//   // flag all non-base classes as ":global(.class)"
//   for (const cls of classes.other) {
//     out = out.replace(new RegExp(cls, 'g'), `:global(${cls})`)
//   }

//   // invoke css-loader with a separate query (to pass it options)
//   // also give it a separate async function so we can rewrite the exported locals as need be
//   callback = this.async()
//   const innerAsync = () => (...args) => postProcessing(callback, classes, ...args)

//   out = cssLoader.call({
//     ...this,
//     async: innerAsync,
//     query: deepMerge(defaultCssLoaderOptions, this.query.cssLoaderOptions)
//   }, out)

//   return
// }

const postcss = require('postcss')
const postCssWrap = require('./postcss-wrap4')

module.exports = async function(source) {
  const callback = this.async()
  const output = await postcss([postCssWrap()])
    .process(source, { from: undefined })

  console.log('processed:', output.css)

  callback(null, output.css)
}