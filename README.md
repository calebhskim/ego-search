# suggest-search
A visualization tool to help search for stuff using a graph constructed from auto-suggestions. Inspired by this [post](https://medium.com/applied-data-science/the-google-vs-trick-618c8fd5359f).

## Local Development
The goal of this project was to use as few frameworks as possible. There is test data for local development within `src` and `src/server.js` is a proxy server that is used to fetch search auto-suggestions. Uncomment and comment out lines wherever you see `// For local development`. You should be able to load `index.html` directly in the browser.

Run `npm run build` to transpile the javascript.

## Todo
- Add comparator selector i.e. be able to choose custom comparator ('vs', 'and', 'or', etc.)
- Select between different search engines