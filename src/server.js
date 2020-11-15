const Koa = require('koa');
const ratelimit = require('koa-ratelimit');
const axios = require('axios');
const xml2js = require('xml2js');
const app = new Koa();

const PORT = 8080;

// Rate limit store
const db = new Map();

const parser = new xml2js.Parser();
const SEARCH_URL = 'https://suggestqueries.google.com/complete/search';

app.use(ratelimit({
  driver: 'memory',
  db: db,
  duration: 60000,
  errorMessage: 'Too many requests. Sometimes you just have to slow down.',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total'
  },
  max: 100,
  disableHeader: false,
  whitelist: (ctx) => false,
  blacklist: (ctx) => false,
}));

app.use(async (ctx, next) => {
  try {
    await next();
  }
  catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message || 'Error processing request';
    ctx.app.emit('error', err, ctx); // TODO: Actually handle event
  }
});

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');

  await next();
});

app.use(async (ctx, next) => {
  // const query = 'docker vs'; // For local development

  let query = '';

  if (ctx && ctx.request && ctx.request.query && ctx.request.query.q) {
    query = ctx.request.query.q;
  }

  if (!query) {
    throw new Error('Unable to process request. No query term found.');
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.append('output', 'toolbar');
  url.searchParams.append('gl', 'us');
  url.searchParams.append('hl', 'en');
  url.searchParams.append('q', query);

  // url.href constructs auto-suggest url
  // Ex: 'http://suggestqueries.google.com/complete/search?output=toolbar&gl=us&hl=en&q=docker+vs'

  const res = await axios.get(url.href);
  let body = {};

  if (res.data) {
    try {
      const parsedData = await parser.parseStringPromise(res.data);
      body = parsedData;
    }
    catch (e) {
      throw new Error('Error parsing XML.');
    }
  }

  ctx.body = body;

  await next();
});

console.log('App listening on port:', PORT);
app.listen(PORT);
