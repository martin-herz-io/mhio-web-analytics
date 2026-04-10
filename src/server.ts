import { appConfig } from "./config/env.js";
import { createApp } from "./app.js";

const { host, port } = appConfig.server;
const app = createApp();

app.listen(port, host, () => {
  console.log(`mhio web analytics listening on ${host}:${port}`);
});
