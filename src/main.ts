import { App } from "./app.js";

const root = document.getElementById("app");
if (!root) throw new Error("#app not found");

const app = new App(root);
app.init();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
