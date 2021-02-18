
CHAR_FUNCS = {
  '.': 'match_dot',
  '{': 'match_curly_open',
  '}': 'match_curly_close',
  '(': 'match_paren_open',
  ')': 'match_paren_close',
  ';': 'match_semi'
}

class Collection {
  constructor (parent = null) {
    this.globalSelectors = []
    this.localSelectors = []
    this.processedChildren = []
    this.parent = parent

    this.child = null
  }

  setChild (child) {
    if (this.child) {
      throw new Error('too many children at a time!')
    }
    this.child = child
  }

  endChild (child) {
    if (!child) {
      throw new Error('what?')
    }
    if (this.child !== child) {
      throw new Error('cannot end a child that is not the current child')
    }

    this.globalSelectors = this.globalSelectors.concat(this.child.globalSelectors)
    this.localSelectors = this.localSelectors.concat(this.child.localSelectors)

    this.processedChildren.push(child)

    this.child = null
  }

  finish () {
    if (this.parent) {
      this.parent.endChild(this)
    }
  }

  next(char) {
    console.log('char', [char])
    if (this.child) {
      this.child.next(char)
      if (!this.child) {
        // child ended, we can check if we end too
        this.checkChildBubble(char)
      }
    }

    const func = char.trim() === '' && this.whitespace || CHAR_FUNCS[char] && this[CHAR_FUNCS[char]] || this.default

    func.call(this, char)
  }

  checkChildBubble() {}

  default() {}

  whitespace(char) {
    console.log('this:', this)
    this.default(char)
  }

  render(indent=0) {
    const childString = this.processedChildren.map(child => child.render(indent+1)).join('\n')
    return `${'  '.repeat(indent)}${this.constructor.name} - local(${this.localSelectors}) global(${this.globalSelectors})\n${childString}`
  }
}

class Selector extends Collection {
  // we end on semi-colon or } if our child end

  constructor(parent = null) {
    super(parent)

    this.value = ''
  }

  finish() {
    this.globalSelectors.push(this.value)
    super.finish()
  }

  match_dot() {
    this.finish()
  }

  whitespace() {
    this.finish()
  }

  default(char) {
    this.value += char
  }
}

class AtRule extends Collection {
  constructor(parent = null) {
    super(parent)

    this._cur = ''
    this.name = ''
    this.params = []
    this.nested = null
  }

  whitespace() {
    if (this._cur.length) {
      if (!this.name) {
        this.name = this._cur
      } else {
        this.params.push(this._cur)
      }
      this._cur = ''
    }
  }

  default(char) {
    this._cur += char
  }

  match_semi() {
    this.finish()
  }
}

class CssTree extends Collection {

  checkChildBubble(char) {
    if (char === '.') {
      // if a child rule ended because we encounter a dot we want to pass it on
      this.match_dot()
    }
  }

  match_dot() {
    // start selector
    this.setChild(new Selector(this))
  }
}

function parseCss(source) {

  const test = new CssTree()

  for (const char of source) {
    test.next(char)
  }

  return test.render()

}

module.exports = parseCss