const Koa = require('koa');
const axios = require('axios');
const xml2js = require('xml2js');
const app = new Koa();

const parser = new xml2js.Parser();
const SEARCH_URL = 'https://suggestqueries.google.com/complete/search';

app.use(async (ctx, next) => {
  try {
    await next();
  }
  catch (e) {
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
  // const url = new URL(SEARCH_URL);
  // url.searchParams.append('output', 'toolbar');
  // url.searchParams.append('gl', 'us');
  // url.searchParams.append('hl', 'en');
  // url.searchParams.append('q', query);

  const res = await axios.get('http://suggestqueries.google.com/complete/search?output=toolbar&gl=us&hl=en&q=docker+vs');
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

app.listen(3000);
