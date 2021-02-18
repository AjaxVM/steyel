
const CHAR_MAPPING = {
  '.': 'mapClassStart',
  ':': 'mapPseudoStart',
  '(': 'mapParentStart',
  ')': 'mapParenEnd',
  '>': 'mapCurValueEnd',
  '+': 'mapCurValueEnd',
  '~': 'mapCurValueEnd',
  '': 'mapWhitespace'
}

class Mapper {
  executeMapping(char) {
    const func = CHAR_MAPPING[char] && this[CHAR_MAPPING[char]] || this.default
    func.call(this, char)
  }

  default() {}

  mapCurValueEnd(char) {
    this.default(char)
  }

  mapWhitespace(char) {
    this.mapCurValueEnd(char)
  }

  mapParenEnd(char) {
    this.default(char)
  }

  mapParentStart(char) {
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

  finish(lastChar) {
    if (this.curValue) {
      const last = this.curValue
      this.curValue = null // stop propagation

      last.finish(lastChar)
      this.value.push(last)
    }

    if (this.parent) {
      this.parent.valueFinished(lastChar)
    }
  }

  next(char) {
    const cur = this.curValue
    if (cur) {
      cur.next(char)
    } else {
      this.executeMapping(char)
    }
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
}

class SelectorValue extends SelectorObj {
  constructor(parent) {
    super(parent)

    this.value = ''
  }

  mapCurValueEnd(char) {
    this.finish(char)
  }

  default(char) {
    this.value += char
  }

  mapClassStart(char) {
    this.mapCurValueEnd(char)
  }

  mapParenEnd(char) {
    this.mapCurValueEnd(char)
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

  valueFinished(lastChar) {
    super.valueFinished(lastChar)
    if (lastChar === '.') {
      this.curValue = new SelectorClassName(this)
    } else if (lastChar === '') {
      this.finish(lastChar)
    }
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

  mapClassStart() {
    this.curValue = new SelectorClass(this)
  }

  mapPseudoStart() {
    this.curValue = new SelectorPseudo(this)
  }

  mapWhitespace() {}
}

class SelectorElement extends SelectorGroup {
  constructor(parent) {
    super(parent)

    this.element = ''
  }

  valueFinished(lastChar) {
    super.valueFinished(lastChar)

    if (lastChar === '') {
      this.finish(lastChar)
    }
  }

  default(char) {
    this.element += char
  }

  mapCurValueEnd(char) {
    this.default(char)
    this.finish(char)
  }

  mapWhitespace(char) {
    this.finish(char)
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
  mapParentStart(char) {
    this.mapCurValueEnd(char)
  }

  format() {
    return `:${this.value}`
  }
}

class SelectorPseudo extends SelectorGroup {
  constructor(parent) {
    super(parent)

    this.useParen = false
    this.name = null
    this.curValue = new SelectorPseudoName(this)
  }

  valueFinished(lastChar) {
    if (this.curValue) {
      if (!this.name) {
        this.name = this.curValue
      } else {
        this.value.push(this.curValue)
      }
      this.curValue = null
    }

    if (lastChar === '(') {
      this.mapParentStart()
    } else if (lastChar === ')') {
      this.finish(lastChar)
    }
  }

  mapWhitespace(char) {
    if (this.useParen) {
      this.finish(char)
    }
  }

  mapParentStart() {
    this.useParen = true
  }

  ast() {
    return {
      ...super.ast(),
      name: this.name.value
    }
  }

  format() {
    const children = super.format()
    const name = this.name.format()
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
      this.next(char.trim())
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
        selectorObjs.push(new Selector(selector))
      }

      console.log(JSON.stringify([...selectorObjs.map(sel => sel.ast())], null, 2))
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