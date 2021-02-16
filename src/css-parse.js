
class Collection {
  matches = {}

  constructor (parent = null) {
    this.globalSelectors = []
    this.localSelectors = []
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

    this.child = null
  }

  finish () {
    if (this.parent) {
      this.parent.endChild(this)
    }
  }

  next(char) {
    if (this.child) {
      return this.child.next(char)
    }
    let func = this.default
    if (this.matches[char]) {
      func = this[this.matches[char]]
    }

    func(char)
  }

  default() {}
}

class CssTree extends Collection {
  
}

function parseCss(source) {

}

module.exports = parseCss