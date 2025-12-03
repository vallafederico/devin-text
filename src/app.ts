import { Scroll } from "@lib/scroll";
import { createCycles, runPageIn, runMount } from "./modules/_";
// import { Pages } from "@lib/pages";

// history.scrollRestoration = "manual";

class _App {
  private scroll = Scroll;
  // pages = Pages;

  constructor() {
    console.log("IIIV");

    createCycles();
    runPageIn();
    runMount();
  }
}

export const App = new _App();
