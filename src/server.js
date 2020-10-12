const Koa = require('koa');
const axios = require('axios');
const app = new Koa();

app.use(async ctx => {
  const res = await axios.get('http://suggestqueries.google.com/complete/search?output=toolbar&gl=us&hl=en&q=docker+vs');
  console.log(res);
  ctx.body = 'Hello World';
});

app.listen(3000);
