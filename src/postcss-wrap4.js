
const CHAR_MAP = {
  '.': 'dot',
  ':': 'colon',
  '(': 'paren_open',
  ')': 'paren_close',
  '#': 'hash',
  '>': 'gt',
  '~': 'tilde',
  '+': 'plus',
  '': 'whitespace',
}

class PrimitiveHandler {
  next(char) {
    const match = CHAR_MAP[char] || CHAR_MAP[char.trim()] || char
    const func = this[`handle_${match}`] || this.handle_default
    // console.log('handle char', char, this.constructor.name, func.name)
    return func.call(this, char)
  }

  handle_default() {
    return true // true means consumed, false means not
  }

  handle_non_default() {
    return false
  }

  handle_dot(char) {
    return this.handle_non_default(char)
  }

  handle_colon(char) {
    return this.handle_non_default(char)
  }

  handle_paren_open(char) {
    return this.handle_non_default(char)
  }

  handle_paren_close(char) {
    return this.handle_non_default(char)
  }

  handle_hash(char) {
    return this.handle_non_default(char)
  }

  handle_combinator(char) {
    this.handle_non_default(char)
  }

  handle_gt(char) {
    return this.handle_combinator(char)
  }

  handle_tilde(char) {
    return this.handle_combinator(char)
  }

  handle_plus(char) {
    return this.handle_combinator(char)
  }

  handle_whitespace(char) {
    return this.handle_non_default(char)
  }
}

class PrimitiveIdentifier extends PrimitiveHandler {
  constructor(initialValue = '') {
    super()
    this.value = initialValue
  }

  finish() {}

  handle_default(char) {
    this.value += char
    return true
  }

  ast() {
    return {
      name: this.constructor.name,
      value: this.value
    }
  }

  format() {
    return this.value
  }
}

class ClassName extends PrimitiveIdentifier {
  format() {
    return `.${this.value}`
  }
}

class ElementName extends PrimitiveIdentifier {}

class IdName extends PrimitiveIdentifier {
  format() {
    return `#${this.value}`
  }
}

class CombinatorName extends PrimitiveIdentifier {
  handle_default() {
    // we only get one char and expect that to be passed in initializer
    return false
  }
}

class SelectorGroup extends PrimitiveIdentifier {
  constructor() {
    super(null)
    this.children = []
    this.curChild = null
    this.finished = false
  }

  static createWrap(child) {
    const n = new this()
    n.children = Array.isArray(child) ? child : [child]
    return n
  }

  replaceChild(child, other) {
    // todo: little bit fragile
    const i = this.children.indexOf(child)
    this.children[i] = other
  }

  next(char) {
    if (this.finished) {
      return false // don't process this if we finished already
    }
    if (this.curChild) {
      if (!this.curChild.next(char)) {
        this.finishChild()
        return super.next(char)
      }
      return true
    }

    return super.next(char)
  }

  finishChild() {
    if (this.curChild) {
      this.curChild.finish()
      this.children.push(this.curChild.singleton || this.curChild)
      this.curChild = null
    }
  }

  checkSingleton() {
    if (this.children.length === 1) {
      [this.singleton] = this.children
    }
  }

  finish() {
    this.finished = true
    this.finishChild()
    this.checkSingleton()
  }

  handle_default(char) {
    this.curChild = new ElementName(char)
    return true
  }

  handle_dot() {
    this.curChild = new ClassName()
    return true
  }

  handle_hash() {
    this.curChild = new IdName()
    return true
  }

  handle_combinator(char) {
    this.children.push(new CombinatorName(char))
    return true
  }

  handle_colon() {
    this.curChild = new PseudoName()
    return true
  }

  handle_whitespace() {
    this.finish()
    return false
  }

  ast() {
    return {
      name: this.constructor.name,
      children: this.children.map(child => child.ast())
    }
  }

  format() {
    return this.children.map(child => child.format()).join('')
  }
}

class PseudoName extends SelectorGroup {
  constructor() {
    super()
    this.type = 'class'
    this.value = ''
    this.hasChildren = false
  }

  static createWrap(value, child, type='class') {
    const n = super.createWrap(child)
    n.value = value
    n.type = type
    if (child) {
      n.hasChildren = true
    }
    return n
  }

  // we don't want to pop single children out of the pseudo
  checkSingleton() {}

  handle_dot() {
    if (this.hasChildren) {
      return super.handle_dot()
    }
    return false
  }

  handle_hash() {
    if (this.hasChildren) {
      return super.handle_hash()
    }
    return false
  }

  handle_combinator(char) {
    if (this.hasChildren) {
      return super.handle_combinator()
    }
    return false
  }

  handle_colon() {
    if (!this.value) {
      this.type = 'element'
      return true
    }
    if (this.hasChildren) {
      return super.handle_colon()
    }
    return false
  }

  handle_default(char) {
    if (!this.hasChildren) {
      this.value += char
      return true
    }
    return super.handle_default(char)
  }

  handle_paren_open() {
    this.hasChildren = true
    return true
  }

  handle_paren_close() {
    this.finish()
    if (this.hasChildren) {
      return true
    }
    return false
  }

  handle_whitespace() {
    if (this.hasChildren) {
      this.finishChild()
      return true
    }
    return super.handle_whitespace()
  }

  ast() {
    return {
      ...super.ast(),
      type: this.type,
      value: this.value
    }
  }

  format() {
    const prefix = this.type === 'class' ? ':' : '::'
    const children = this.hasChildren ? `(${this.children.map(child => child.format()).join(' ')})` : ''
    return `${prefix}${this.value}${children}`
  }
}

class Selector extends SelectorGroup {
  // TODO: bubble persistWhitespace to all groups?
  constructor(source, persistWhitespace=false) {
    super()
    this.source = source
    this.persistWhitespace = persistWhitespace
    this.parse()
  }

  parse() {
    for (const char of this.source) {
      this.next(char)
    }

    this.finish()
  }

  handle_default(char) {
    this.curChild = new SelectorGroup()
    this.curChild.next(char)
    return true
  }

  handle_non_default(char) {
    this.children.push(new PrimitiveIdentifier(char))
    return true
  }

  handle_dot(char) {
    return this.handle_default(char)
  }

  handle_hash(char) {
    return this.handle_default(char)
  }

  handle_combinator(char) {
    return this.handle_default(char)
  }

  handle_colon(char) {
    return this.handle_default(char)
  }

  handle_whitespace(char) {
    this.finishChild()
    if (this.persistWhitespace) {
      this.children.push(new PrimitiveIdentifier(char))
    }
    return true
  }

  format() {
    return this.persistWhitespace && super.format() || this.children.map(child => child.format()).join(' ')
  }
}

function walkFind(node, target, flags = []) {
  if (node.constructor.name === target) {
    return {
      node,
      flags
    }
  }

  if (node.constructor.name === 'PseudoName') {
    if (node.hasChildren) {
      // just make a new copy of flags to send to children
      flags = [
        ...flags,
        node.value
      ]
    } else {
      // update global flags
      flags.push(node.value)
    }
  }

  if (node.children) {
    for (const child of node.children) {
      const res = walkFind(child, target, flags)
      if (res) {
        return {
          parent: node,
          ...res
        }
      }
    }
  }
}

function getLastMatching(arr, targets) {
  for (let i=arr.length-1; i >= 0; i--) {
    if (targets.includes(arr[i])) {
      return arr[i]
    }
  }

  return null
}

function parseSelector(source) {
  // const sel = new Selector(source, true)
  // const out = sel.format()
  // const match = source === out

  // if (!match) {
  //   console.log(source, out)
  //   throw new Error('no match')
  // }

  // TODO: add an opt to the plugin to test or run

  const sel = new Selector(source)
  // console.log('\nhandle selector')
  // console.log('inp:', source)
  // console.log('out:', sel.format())
  // console.log('ast:', JSON.stringify(sel.ast(), null, 2))

  // find first class, and track whether we have a local/global mod
  const { parent, node, flags } = walkFind(sel, 'ClassName') || {}
  const doWrap = !getLastMatching(flags || [], ['local', 'global'])
  // console.log(source, getLastMatching(flags || [], ['local', 'global']))
  if (doWrap) {
    parent.replaceChild(node, PseudoName.createWrap('local', node))
  }

  console.log(source, '||', parent.format())
}

module.exports = (opts = { }) => {
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