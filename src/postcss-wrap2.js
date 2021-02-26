
const CHAR_MAPPING = {
  '.': 'mapClassStart',
  ':': 'mapPseudoStart',
  '(': 'mapParenStart',
  ')': 'mapParenEnd',
  '>': 'mapCombinator',
  '+': 'mapCombinator',
  '~': 'mapCombinator'
}

class Char {
  constructor(value) {
    this.value = value
    this.consumed = false
    this.whitespace = value.trim() === ''
  }

  consume() {
    this.consumed = true
  }
}


class SelectorPrimitive {
  constructor(parent = null, initialChar) {
    this.parent = parent
    this.value = ''

    if (initialChar) {
      this.next(initialChar)
    }
  }

  // processors
  next(char) {
    const mapping = CHAR_MAPPING[char.value] || (char.whitespace && 'mapWhitespace') || 'default'
    const func = this[mapping] || this.default
    
    func.call(this, char)
  }

  finish(cascade = true) {
    if (this.parent && cascade) {
      this.parent.finishValue()
    }
  }

  finishValue() {}

  consumeOnlyAndFinish(char) {
    if (!this.value) {
      this.value = char.value
      char.consume()
    }
    this.finish()
  }

  consumeOnlyOrFinish(char) {
    if (!this.value) {
      this.value = char.value
      char.consume()
    } else {
      this.finish()
    }
  }

  // handlers
  default(char) {
    this.value += char.value
    char.consume()
  }

  mapParenStart(char) {
    this.consumeOnlyAndFinish(char)
  }

  mapParenEnd(char) {
    this.consumeOnlyAndFinish(char)
  }

  mapCombinator(char) {
    this.consumeOnlyAndFinish(char)
  }

  mapWhitespace(char) {
    this.consumeOnlyAndFinish(char)
  }

  mapClassStart() {
    this.finish()
  }

  mapPseudoStart() {
    this.finish()
  }

  // utils
  matchVals(prop, value) {
    if (Array.isArray(value)) {
      return value.includes(this[prop])
    }
    return this[prop] === value
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
}


class SelectorGroup extends SelectorPrimitive {
  constructor(parent = null, initialChar) {
    super(parent)
    this.value = []

    if (initialChar) {
      this.next(initialChar)
    }
  }

  next(char) {
    const cur = this.curValue
    if (cur) {
      cur.next(char)
    }

    if (!char.consumed || !cur) {
      super.next(char)
    }
  }

  finish(cascade = true) {
    this.finishValue()

    super.finish(cascade)
  }

  finishValue() {
    if (this.curValue) {
      this.value.push(this.curValue)
      this.curValue.finish(false)
      this.curValue = null
    }
  }

  default(char) {
    this.curValue = new SelectorPrimitive(this, char)
  }

  mapClassStart(char) {
    this.finishValue()
    this.curValue = new SelectorClass(this, char)
  }

  mapPseudoStart(char) {
    this.finishValue()
    this.curValue = new SelectorPseudo(this, char)
  }

  mapWhitespace(char) {
    this.default(char)
  }

  mapCombinator(char) {
    this.default(char)
  }

  mapParenStart(char) {
    this.default(char)
    this.finishValue()
    this.curValue = new SelectorGroup(this)
  }

  mapParenEnd(char) {
    if (this.parent) {
      this.finish()
    } else {
      this.default(char)
    }
  }

  ast() {
    return {
      node: this.constructor.name,
      value: [...this.value.map(val => val.ast())]
    }
  }

  format() {
    return [...this.value.map(val => val.format())].join('')
  }
}


class SelectorClassName extends SelectorPrimitive {
  mapClassStart(char) {
    this.consumeOnlyOrFinish(char)
  }

  mapParenStart() {
    this.finish()
  }

  mapParenEnd() {
    this.finish()
  }

  mapPseudoStart() {
    this.finish()
  }

  mapCombinator() {
    this.finish()
  }

  mapWhitespace() {
    this.finish()
  }
}


class SelectorClass extends SelectorGroup {
  mapClassStart(char) {
    this.curValue = new SelectorClassName(this, char)
    // this.curValue.next(char)
  }

  mapParenStart() {
    this.finish()
  }

  default() {
    this.finish()
  }
}


class SelectorPseudoName extends SelectorPrimitive {

  mapClassStart() {
    this.finish()
  }

  mapParenStart() {
    this.finish()
  }

  mapParenEnd() {
    this.finish()
  }

  mapPseudoStart(char) {
    if (!this.value || this.value === ':') {
      this.default(char)
    } else {
      this.finish()
    }
  }

  mapCombinator() {
    this.finish()
  }

  mapWhitespace() {
    this.finish()
  }
}


class SelectorPseudo extends SelectorGroup {
  constructor(parent = null, initialChar) {
    super(parent, initialChar)

    this.useParen = false
    this.name = null
  }

  finishValue() {
    if (this.curValue) {
      if (!this.name) {
        this.name = this.curValue.value
      } else {
        this.curValue.finish(false)
        this.value.push(this.curValue)
      }
      this.curValue = null
    }
  }

  mapPseudoStart(char) {
    this.curValue = new SelectorPseudoName(this, char)
  }

  mapParenStart(char) {
    if (!this.value.length) {
      this.useParen = true
    }
    this.default(char)
  }

  mapParenEnd(char) {
    if (this.useParen) {
      this.default(char)
    }
    this.finish()
  }

  ast() {
    return {
      ...super.ast(),
      name: this.name
    }
  }

  format() {
    return `${this.name}${super.format()}`
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

    this.finish()
  }

  ast() {
    return {
      ...super.ast(),
      src: this.src,
      reformatted: this.format()
    }
  }
}


function parseSelector(source) {
  const sel = new Selector(source)
  const out = sel.format()

  const match = source === out

  if (!match) {
    console.log(source, out)
    throw new Error('no match', out)
  }

  // console.log('AST:', JSON.stringify(sel.ast(), null, 2))
  // console.log('source', source)
  // console.log('reform', sel.format())
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