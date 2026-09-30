const H = require('./lib');
(async () => { const { b, p } = await H.open();
  await H.go(p, '/productivity/vendor-management/purchase-orders');
  console.log((await H.text(p,false)).slice(0,1800));
  await b.close(); })();
