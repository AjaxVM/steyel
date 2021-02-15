
const classCharsRe = /[_a-zA-Z0-9-]/

const handlers = {
  '{': (status) => {
    status.curlyDepth += 1
    status.rootClass = false // once in a paren we no longer care about a root class
  },
  '}': (status) => {
    status.curlyDepth -= 1
    if (status.atRule && status.curlyDepth === 0) {
      status.atRule = false
    }
  },
  '.': (status) => {
    status.midClass = true
  },
  '@': (status) => {
    if (status.curlyDepth === 0) {
      status.atRule = true
    }
  },
  'default': (status, char) => {
    if (status.midClass) {
      status.cur = (status.cur || '.') + char
    }
  },
  'commit': (status, char) => {
    if (!status.cur) {
      return
    }

    if (status.rootClass || (!status.atRule && status.curlyDepth > 0) || (status.atRule && status.curlyDepth > 1)) {
      status.other.add(status.cur)
    } else {
      status.root.add(status.cur)
      status.rootClass = true
    }
    status.cur = ''
    if (char !== '.') {
      status.midClass = false
    }
  }
}

function handle(char, status) {
  if (handlers[char]) {
    handlers[char](status, char)
    handlers.commit(status, char)
  } else if (!char.match(classCharsRe)) {
    // not a valid class character just commit and move on
    handlers.commit(status, char)
  } else {
    handlers['default'](status, char)
  }
}

function extractClasses (source) {
  const status = {
    root: new Set(),
    other: new Set(),
    curlyDepth: 0,
    parenDepth: 0, // todo: support ignoring classes defined in :local()/:global()
    atRule: false,
    cur: '',
    midClass: false,
    rootClass: false
  }

  for (const char of source) {
    handle(char, status)
  }

  return {
    root: [...status.root],
    other: [...status.other].filter(cls => !status.root.has(cls))
  }
}

module.exports = extractClasses
