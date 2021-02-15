# steyel-loader
Webpack loader that provides an opinionated layer on top of css-loader modules, so that imported rules are localized at the root element only. The root element className is persisted alongside a localized version - though only the localized version has any css rules tied to it.
This promotes simple overwriting of styles by parent styles, using the unlocalized name in a clean way.
