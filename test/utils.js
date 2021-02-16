const path = require('path')
const webpack = require('webpack')
const { createFsFromVolume, Volume } = require('memfs')

module.exports = {
  getCompiler: (fixture, config = {}) => {
    const compiler = webpack({
      context: __dirname,
      entry: `./${fixture}`,
      output: {
        path: path.resolve(__dirname),
        filename: 'bundle.js',
      },
      module: {
        rules: [
          {
            test: config.test || /\.css$/,
            use: [{
              loader: path.resolve(__dirname, '../src'),
              options: config.options,
            }].concat(config.preLoaders || []),
          },
        ],
      },
    })

    compiler.outputFileSystem = createFsFromVolume(new Volume())
    compiler.outputFileSystem.join = path.join.bind(path)

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) reject(err)
        if (stats.hasErrors()) reject(stats.toJson().errors)

        resolve(stats)
      })
    })
  },
  localRegex: (name, localized=true) => {
    const local = localized ? '\\s+.+' : ''
    return new RegExp(`\\.locals\\s*\\=\\s*\\{.*\\"${name}\\"\\:\\s*\\"${name}${local}\\"\\,?.*\\}`, 's')
  },
}