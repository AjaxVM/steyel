
const CHAR_MAPPING = {
  '.': 'mapClassStart',
  ':': 'mapPseudoStart',
  '(': 'mapParenStart',
  ')': 'mapParenEnd',
  '>': 'mapSpecial',
  '+': 'mapSpecial',
  '~': 'mapSpecial',
  '': 'mapWhitespace'
}

function matchVals(obj, prop, value) {
  if (Array.isArray(value)) {
    return value.includes(obj[prop])
  }
  return obj[prop] === value
}

class Char {
  constructor(char) {
    this.char = char
    this.consumed = false
    this.whitespace = char.trim() === ''
  }

  consume() {
    this.consumed = true
  }
}

class Mapper {
  executeMapping(char) {
    const func = CHAR_MAPPING[char.char] && this[CHAR_MAPPING[char.char]] || this.default
    func.call(this, char)
  }

  default(char) {
    char.consume()
  }

  mapSpecial(char) {
    this.default(char)
  }

  mapWhitespace(char) {
    this.mapSpecial(char)
  }

  mapParenEnd(char) {
    this.default(char)
  }

  mapParenStart(char) {
    this.default(char)
  }

  mapClassStart(char) {
    this.default(char)
  }

  mapPseudoStart(char) {
    this.default(char)
  }
}

class SelectorObj extends Mapper {
  constructor(parent) {
    super()
    console.log('init', this.constructor.name)
    this.parent = parent
    this.value = []
    this.curValue = null
  }

  valueFinished() {
    if (this.curValue) {
      this.value.push(this.curValue)
      this.curValue = null
    }
  }

  // finish(lastChar) {
  finish() {
    console.log('finish', this.constructor.name, this.curValue, this.value)
    if (this.curValue) {
      this.curValue.finish()
      this.value.push(this.curValue)
      // const last = this.curValue
      // this.curValue = null

      // last.finish(lastChar)
      // this.value.push(last)
    }

    // if (this.parent) {
    //   this.parent.valueFinished(lastChar)
    // }
  }

  next(char) {
    const cur = this.curValue
    if (cur) {
      cur.next(char)
    } 
    
    if (!char.consumed || !cur) {
      this.executeMapping(char)
    }
  }

  mapSpecial() {
    this.finish()
  }

  ast() {
    return {
      node: this.constructor.name,
      value: [...this.value.map(val => val.ast())]
    }
  }

  format() {
    return [...this.value.map(val => val.format())].join(' ')
  }

  findValues(type, prop, propValue) {
    const values = this.value
      .map(val => val.constructor.name === type ? val : val.findValues(type))
      .reduce((accum, val) => accum.concat(val), [])

    if (prop) {
      // filter at end of finding all child values
      return values.filter(val => matchVals(val, prop, propValue))
    }

    return values
  }

  hasValues(type, prop, propValue) {
    return this.findValues(type, prop, propValue).length > 0
  }

  firstValue(type, prop, propValue) {
    // todo
    for (const val of this.value) {
      if (val.constructor.name === type || (!prop || val[prop] === propValue)) {
        return val
      } else {
        const check = val.firstValue(type, prop, propValue)
        if (check) {
          return check
        }
      }
    }
  }

  findParents(type, prop, propValue) {
    const parents = []

    let cur = this.parent
    while (cur) {
      if ((!type || cur.constructor.name === type) && (!prop || matchVals(cur, prop, propValue))) {
        parents.push(cur)
      }
      cur = cur.parent
    }

    return parents
  }

  hasParents(type, prop, propValue) {
    return this.findParents(type, prop, propValue).length > 0
  }
}

class SelectorValue extends SelectorObj {
  constructor(parent) {
    super(parent)

    this.value = ''
  }

  // mapSpecial(char) {
  mapSpecial() {
    // this.finish(char)
    this.finish()
  }

  default(char) {
    this.value += char.char
    char.consume()
  }

  // mapClassStart(char) {
  mapClassStart() {
    // this.mapSpecial(char)
    this.mapSpecial()
  }

  // mapParenEnd(char) {
  mapParenEnd() {
    // this.mapSpecial(char)
    this.mapSpecial()
  }

  ast() {
    return {
      node: this.constructor.name,
      value: this.value
    }
  }

  format() {
    return this.value
  }

  findValues(type) {
    return null
  }
}

class SelectorClassName extends SelectorValue {
  format() {
    return `.${this.value}`
  }
}

class SelectorClass extends SelectorObj {
  constructor(parent) {
    super(parent)
    this.curValue = new SelectorClassName(this)
  }

  // valueFinished(lastChar) {
  //   super.valueFinished(lastChar)
  //   if (lastChar === '.') {
  //     this.curValue = new SelectorClassName(this)
  //   } else if (lastChar === '') {
  //     this.finish(lastChar)
  //   }
  // }

  mapClassStart(char) {
    this.curValue = new SelectorClassName(this)
    char.consume()
  }

  mapWhitespace() {
    this.finish()
  }

  format() {
    return [...this.value.map(val => val.format())].join('')
  }
}

class SelectorGroup extends SelectorObj {
  default(char) {
    this.curValue = new SelectorElement(this)
    this.curValue.next(char)
  }

  // mapClassStart() {
  mapClassStart(char) {
    this.curValue = new SelectorClass(this)
    char.consume()
  }

  // mapPseudoStart() {
  mapPseudoStart(char) {
    this.curValue = new SelectorPseudo(this)
    char.consume()
  }

  // mapWhitespace() {}
  mapWhitespace(char) {
    this.default(char)
  }
}

class SelectorElement extends SelectorGroup {
  constructor(parent) {
    super(parent)

    this.element = ''
  }

  // valueFinished(lastChar) {
  //   super.valueFinished(lastChar)

  //   if (lastChar === '') {
  //     this.finish(lastChar)
  //   }
  // }

  default(char) {
    this.element += char.char
    char.consume()
  }

  // mapSpecial(char) {
  mapSpecial() {
    // this.default(char)
    // this.finish(char)
    this.finish()
  }

  mapWhitespace(char) {
    // this.finish(char)
    this.default(char)
  }

  ast() {
    return {
      node: this.constructor.name,
      value: [...this.value.map(val => val.ast())],
      element: this.element
    }
  }

  format() {
    return `${this.element}${super.format()}`
  }
}

class SelectorPseudoName extends SelectorValue {
  // mapParenStart(char) {
  mapParenStart() {
    // this.mapSpecial(char)
    this.finish()
  }

  format() {
    return `:${this.value}`
  }
}

class SelectorPseudo extends SelectorGroup {
  constructor(parent) {
    super(parent)

    this.useParen = false
    this._name = null
    this.name = null
    this.curValue = new SelectorPseudoName(this)
  }

  // valueFinished(lastChar) {
  //   if (this.curValue) {
  //     if (!this._name) {
  //       this._name = this.curValue
  //       this.name = this._name.value
  //     } else {
  //       this.value.push(this.curValue)
  //     }
  //     this.curValue = null
  //   }

  //   if (lastChar === '(') {
  //     this.mapParenStart()
  //   } else if (lastChar === ')') {
  //     this.finish(lastChar)
  //   }
  // }

  // mapWhitespace(char) {
  //   if (this.useParen) {
  //     this.finish(char)
  //   }
  // }

  mapParenStart(char) {
    this.useParen = true
    char.consume()
  }

  mapParenEnd(char) {
    if (this.useParen) {
      char.consume()
    }

    this.finish()
  }

  ast() {
    return {
      ...super.ast(),
      name: this._name.value
    }
  }

  format() {
    const children = super.format()
    const name = this._name.format()
    if (this.useParen) {
      return `${name}(${children})`
    }
    return `${name} ${children}`
  }
}

class Selector extends SelectorGroup {
  constructor(src) {
    super()
    this.src = src

    this.iterate()
  }

  iterate() {
    for (const char of this.src) {
      this.next(new Char(char))
    }

    this.finish('')
  }

  ast() {
    return {
      ...super.ast(),
      src: this.src,
      reformatted: this.format()
    }
  }
}

module.exports = (opts = { }) => {
  // Work with options here

  return {
    postcssPlugin: 'postcss-wrap',
    /*
    Root (root, postcss) {
      // Transform CSS AST here
    }
    */

    Rule (decl) {
      // The faster way to find Declaration node
      const selectorObjs = []

      for (const selector of decl.selectors) {
        const sel = new Selector(selector)
        selectorObjs.push(sel)

        console.log('AST:', JSON.stringify(sel.ast(), null, 2))
        // console.log(sel.findValues('SelectorClassName'))
        // console.log(sel.findValues('SelectorClassName', 'value', 'root'))

        // const classNames = sel.findValues('SelectorClassName')
        // for (const className of classNames) {
        //   console.log(className.findParents('SelectorPseudo', 'name', ['global', 'local']))
        // }
      }
    }

    /*
    Declaration: {
      color: (decl, postcss) {
        // The fastest way find Declaration node if you know property name
      }
    }
    */
  }
}
module.exports.postcss = true