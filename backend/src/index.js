const { app, bootstrapPollers } = require('./app');

const port = Number(process.env.PORT || 3000);
bootstrapPollers().finally(() => {
  app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
});
