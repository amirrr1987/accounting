import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import App from "./App.vue";
import { router } from "./router";
import "./styles.css";
import { faIR } from "./locale/fa-IR";
import { initThemeEarly } from "./composables/useTheme";
import { installLatinDigits } from "./directives/latinDigits";

initThemeEarly();

const app = createApp(App);
installLatinDigits(app);

app.use(router);
app.use(PrimeVue, {
  ripple: true,
  rtl: true,
  locale: faIR,
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".dark",
      cssLayer: false,
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
