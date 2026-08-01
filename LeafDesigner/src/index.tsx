import { render } from "preact";
import { LocationProvider, Router, Route } from "preact-iso";

import { Library } from "./pages/Lib/index";
import { LeafDesigner } from "./pages/LeafDesigner/index";
import { GeomEditorPage } from "./pages/GeomEditor";
import { NotFound } from "./pages/_404";
import "./style.css";

export function App() {
  return (
    <LocationProvider>
      <main>
        <Router>
          <Route path="/" component={Library} />
          <Route path="/leaf" component={LeafDesigner} />
          <Route path="/leaf/geometry" component={GeomEditorPage} />
          <Route path="/leaf/geometry/:id" component={GeomEditorPage} />
          <Route default component={NotFound} />
        </Router>
      </main>
    </LocationProvider>
  );
}

render(<App />, document.querySelector("#app"));
